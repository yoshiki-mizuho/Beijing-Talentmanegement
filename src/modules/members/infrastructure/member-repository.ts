import {
  AuthRole,
  NotificationType,
  Prisma,
  SkillSelfAssessmentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { INITIAL_PASSWORD } from "@/modules/auth/domain/password-schema";
import type { MemberInput, MemberSkillInput } from "@/modules/members/domain/member-schema";
import type { MemberSearchInput } from "@/modules/members/domain/member-search";
import { assertUserCanLinkToMember } from "@/modules/members/domain/member-user-policy";
import type {
  SkillAssessmentBatchInput,
  SkillAssessmentInput,
  SkillAssessmentReviewInput
} from "@/modules/members/domain/skill-assessment-schema";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";

async function hashInitialPassword() {
  return bcrypt.hash(INITIAL_PASSWORD, 12);
}

export async function listDepartments() {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
}

export function buildMemberSearchWhere(
  input?: MemberSearchInput
): Prisma.MemberWhereInput {
  return {
    ...(input?.q
      ? {
          OR: [
            { employeeNo: { contains: input.q, mode: "insensitive" as const } },
            { name: { contains: input.q, mode: "insensitive" as const } },
            { email: { contains: input.q, mode: "insensitive" as const } },
            { jobTitle: { contains: input.q, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(input?.departmentId ? { departmentId: input.departmentId } : {}),
    ...(input?.status ? { status: input.status } : {}),
    ...(input?.skillId || input?.minLevel
      ? {
          memberSkills: {
            some: {
              ...(input.skillId ? { skillId: input.skillId } : {}),
              ...(input.minLevel ? { level: { gte: input.minLevel } } : {})
            }
          }
        }
      : {})
  };
}

export async function listMembers(input?: MemberSearchInput) {
  const members = await prisma.member.findMany({
    where: buildMemberSearchWhere(input),
    include: {
      department: true,
      memberSkills: {
        include: {
          skill: {
            include: {
              category: true
            }
          }
        },
        orderBy: {
          skill: {
            name: "asc"
          }
        }
      }
    },
    orderBy: { employeeNo: "asc" }
  });

  if (!input?.roleId) {
    return members;
  }

  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
    include: {
      roleRequirements: true
    }
  });

  if (!role) {
    return [];
  }

  const requirements = role.roleRequirements.map((requirement) => ({
    skillId: requirement.skillId,
    requiredLevel: requirement.requiredLevel,
    isRequired: requirement.isRequired
  }));

  return members.filter((member) =>
    evaluateRoleAchievement(
      requirements,
      member.memberSkills.map((memberSkill) => ({
        skillId: memberSkill.skillId,
        level: memberSkill.level
      }))
    ).achieved
  );
}

export async function createMember(input: MemberInput) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.member.create({ data: input });
    const existingUser = await tx.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        passwordHash: true,
        memberId: true
      }
    });

    if (existingUser) {
      assertUserCanLinkToMember(existingUser.memberId, member.id);

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name: input.name,
          memberId: member.id,
          ...(existingUser.passwordHash
            ? {}
            : {
                passwordHash: await hashInitialPassword(),
                passwordChangeRequired: true
              })
        }
      });
      return member;
    }

    await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashInitialPassword(),
        passwordChangeRequired: true,
        role: AuthRole.MEMBER,
        memberId: member.id
      }
    });

    return member;
  });
}

export async function updateMember(id: string, input: MemberInput) {
  return prisma.member.update({
    where: { id },
    data: input
  });
}

export async function deactivateMember(id: string) {
  return prisma.member.update({
    where: { id },
    data: { status: "INACTIVE" }
  });
}

export async function upsertMemberSkill(input: MemberSkillInput) {
  return prisma.memberSkill.upsert({
    where: {
      memberId_skillId: {
        memberId: input.memberId,
        skillId: input.skillId
      }
    },
    update: {
      level: input.level,
      lastAssessedAt: new Date()
    },
    create: {
      memberId: input.memberId,
      skillId: input.skillId,
      level: input.level,
      lastAssessedAt: new Date()
    }
  });
}

export async function removeMemberSkill(memberId: string, skillId: string) {
  return prisma.memberSkill.delete({
    where: {
      memberId_skillId: {
        memberId,
        skillId
      }
    }
  });
}

export async function listMemberSkillAssessments(memberId: string) {
  return prisma.skillSelfAssessment.findMany({
    where: { memberId },
    include: {
      skill: {
        include: {
          category: true
        }
      },
      reviewedByMember: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function listPendingSkillAssessments() {
  return prisma.skillSelfAssessment.findMany({
    where: { status: SkillSelfAssessmentStatus.PENDING },
    include: {
      member: {
        include: {
          department: true
        }
      },
      skill: {
        include: {
          category: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function createSkillAssessment(input: SkillAssessmentInput) {
  const [assessment] = await createSkillAssessments({
    memberId: input.memberId,
    assessments: [{
      skillId: input.skillId,
      requestedLevel: input.requestedLevel,
      yearsOfExperience: input.yearsOfExperience
    }]
  });

  return assessment;
}

export async function createSkillAssessments(input: SkillAssessmentBatchInput) {
  return prisma.$transaction(async (tx) => {
    const skillIds = input.assessments.map((assessment) => assessment.skillId);
    const [member, skills, pendingAssessments, reviewerMembers] = await Promise.all([
      tx.member.findUniqueOrThrow({
        where: { id: input.memberId },
        select: { name: true }
      }),
      tx.skill.findMany({
        where: { id: { in: skillIds }, isActive: true },
        select: { id: true, name: true }
      }),
      tx.skillSelfAssessment.findMany({
        where: {
          memberId: input.memberId,
          skillId: { in: skillIds },
          status: SkillSelfAssessmentStatus.PENDING
        },
        select: { skillId: true }
      }),
      tx.user.findMany({
        where: {
          role: { in: ["ADMIN", "MANAGER"] },
          memberId: { not: null }
        },
        select: { memberId: true }
      })
    ]);

    if (skills.length !== skillIds.length) {
      throw new UserFacingError(
        "申請対象に存在しない、または無効なスキルが含まれています。"
      );
    }
    if (pendingAssessments.length > 0) {
      throw new UserFacingError("すでに承認待ちのスキルが含まれています。");
    }

    const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]));
    const assessments = [];

    for (const item of input.assessments) {
      assessments.push(await tx.skillSelfAssessment.create({
        data: {
          memberId: input.memberId,
          skillId: item.skillId,
          requestedLevel: item.requestedLevel,
          yearsOfExperience: item.yearsOfExperience === undefined
            ? undefined
            : new Prisma.Decimal(item.yearsOfExperience)
        }
      }));
    }

    const notifications = assessments.flatMap((assessment) =>
      reviewerMembers
        .map((reviewer) => reviewer.memberId)
        .filter((memberId): memberId is string => Boolean(memberId))
        .map((recipientMemberId) => ({
          recipientMemberId,
          type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
          skillSelfAssessmentId: assessment.id,
          title: "スキル申告の承認依頼",
          body: `${member.name} が ${skillNames.get(assessment.skillId)} Lv.${assessment.requestedLevel} を申告しました。`
        }))
    );

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return assessments;
  });
}

export async function reviewSkillAssessment(input: SkillAssessmentReviewInput) {
  return prisma.$transaction(async (tx) => {
    const assessment = await tx.skillSelfAssessment.findUniqueOrThrow({
      where: { id: input.assessmentId },
      include: {
        member: true,
        skill: true
      }
    });

    if (assessment.status !== SkillSelfAssessmentStatus.PENDING) {
      throw new UserFacingError("承認待ちのスキル申請のみ確認できます。");
    }

    const approvedLevel =
      input.status === SkillSelfAssessmentStatus.CORRECTED
        ? input.correctedLevel
        : assessment.requestedLevel;

    if (input.status !== SkillSelfAssessmentStatus.REJECTED && approvedLevel) {
      await tx.memberSkill.upsert({
        where: {
          memberId_skillId: {
            memberId: assessment.memberId,
            skillId: assessment.skillId
          }
        },
        update: {
          level: approvedLevel,
          yearsOfExperience: assessment.yearsOfExperience,
          approvedByMemberId: input.reviewerMemberId,
          approvedAt: new Date(),
          lastAssessedAt: new Date()
        },
        create: {
          memberId: assessment.memberId,
          skillId: assessment.skillId,
          level: approvedLevel,
          yearsOfExperience: assessment.yearsOfExperience,
          approvedByMemberId: input.reviewerMemberId,
          approvedAt: new Date(),
          lastAssessedAt: new Date()
        }
      });
    }

    const reviewedAssessment = await tx.skillSelfAssessment.update({
      where: { id: input.assessmentId },
      data: {
        requestedLevel: approvedLevel ?? assessment.requestedLevel,
        status: input.status,
        managerComment: input.managerComment,
        reviewedByMemberId: input.reviewerMemberId,
        reviewedAt: new Date()
      }
    });
    const notificationType =
      input.status === SkillSelfAssessmentStatus.APPROVED
        ? NotificationType.SKILL_ASSESSMENT_APPROVED
        : input.status === SkillSelfAssessmentStatus.CORRECTED
          ? NotificationType.SKILL_ASSESSMENT_CORRECTED
          : NotificationType.SKILL_ASSESSMENT_REJECTED;

    await tx.notification.create({
      data: {
        recipientMemberId: assessment.memberId,
        type: notificationType,
        skillSelfAssessmentId: assessment.id,
        title: "スキル申告の承認結果",
        body: `${assessment.skill.name} の申告は ${input.status} になりました。`
      }
    });

    return reviewedAssessment;
  });
}
