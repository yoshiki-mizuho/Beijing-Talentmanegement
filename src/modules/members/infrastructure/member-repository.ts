import {
  AuthRole,
  NotificationStatus,
  NotificationType,
  Prisma,
  type SkillSelfAssessment,
  SkillLevelChangeSource,
  SkillSelfAssessmentStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { generateInitialPassword } from "@/modules/auth/domain/initial-password";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import { diffForAudit } from "@/modules/audit/domain/audit-diff";
import { recordAuditLog, recordAuditLogs } from "@/modules/audit/infrastructure/audit-repository";
import { createsManagerCycle } from "@/modules/members/domain/member-manager-policy";
import type {
  MemberInput,
  MemberManagerInput,
  MemberSkillInput,
  MemberTargetRoleInput
} from "@/modules/members/domain/member-schema";
import type { MemberSearchInput } from "@/modules/members/domain/member-search";
import { canReviewSkillAssessment } from "@/modules/members/domain/skill-assessment-policy";
import { shouldRecordSkillLevelChange } from "@/modules/members/domain/skill-level-change-policy";
import { assertUserCanLinkToMember } from "@/modules/members/domain/member-user-policy";
import { getMemberRoleChangeError } from "@/modules/members/domain/member-role-policy";
import type {
  SkillAssessmentApprovalBatchInput,
  SkillAssessmentBatchInput,
  SkillAssessmentInput,
  SkillAssessmentReviewInput
} from "@/modules/members/domain/skill-assessment-schema";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export async function hashInitialPassword(password = generateInitialPassword()) {
  return bcrypt.hash(password, 12);
}

function memberAuditFields(member: {
  employeeNo: string;
  name: string;
  email: string;
  departmentId: string;
  jobTitle: string | null;
  status: string;
}) {
  return {
    employeeNo: member.employeeNo,
    name: member.name,
    email: member.email,
    departmentId: member.departmentId,
    jobTitle: member.jobTitle,
    status: member.status
  };
}

export async function listDepartments() {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
}

export async function listManagerCandidates() {
  return prisma.member.findMany({
    where: {
      status: "ACTIVE",
      users: { some: { role: { in: [AuthRole.ADMIN, AuthRole.MANAGER] } } }
    },
    select: { id: true, name: true, employeeNo: true },
    orderBy: { employeeNo: "asc" }
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

export async function listMembers(input?: MemberSearchInput, memberIds?: string[]) {
  const members = await prisma.member.findMany({
    where: {
      AND: [
        buildMemberSearchWhere(input),
        ...(memberIds ? [{ id: { in: memberIds } }] : [])
      ]
    },
    include: {
      users: { select: { role: true } },
      department: true,
      manager: { select: { id: true, name: true } },
      targetRole: { select: { id: true, name: true, isActive: true } },
      growthHint: { select: { generatedAt: true } },
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

export function getGrowthHintMemberContext(memberId: string, since: Date) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      managerId: true,
      memberSkills: {
        where: { approvedAt: { not: null } },
        select: {
          skillId: true,
          level: true,
          skill: { select: { name: true, category: { select: { name: true } } } }
        }
      },
      targetRole: {
        select: {
          name: true,
          roleRequirements: {
            where: { isRequired: true },
            select: {
              skillId: true,
              requiredLevel: true,
              skill: { select: { name: true } }
            }
          }
        }
      },
      skillLevelChanges: {
        where: { changedAt: { gte: since } },
        orderBy: [{ changedAt: "asc" }, { id: "asc" }],
        select: {
          skillId: true,
          fromLevel: true,
          toLevel: true,
          source: true,
          skill: { select: { name: true } }
        }
      }
    }
  });
}

export async function updateMemberRole(
  memberId: string,
  nextRole: AuthRole,
  actorMemberId: string
) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.member.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        status: true,
        users: { select: { id: true, role: true } },
        _count: { select: { reports: true } }
      }
    });
    const user = member.users[0];
    if (!user) {
      throw new UserFacingError("ログイン用のユーザーがありません");
    }
    const activeAdminCount = await tx.user.count({
      where: {
        role: AuthRole.ADMIN,
        member: { status: "ACTIVE" }
      }
    });
    const error = getMemberRoleChangeError({
      actorMemberId,
      targetMemberId: memberId,
      currentRole: user.role,
      nextRole,
      activeAdminCount,
      targetIsActive: member.status === "ACTIVE",
      reportCount: member._count.reports
    });
    if (error) {
      throw new UserFacingError(error);
    }
    if (user.role === nextRole) {
      return member;
    }
    await tx.user.update({
      where: { id: user.id },
      data: { role: nextRole }
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_ROLE_UPDATE,
      targetType: AUDIT_TARGET_TYPE.MEMBER,
      targetId: memberId,
      before: { role: user.role },
      after: { role: nextRole },
      changedFields: ["role"]
    });
    return member;
  });
}

export async function createMember(input: MemberInput, actorMemberId: string | null) {
  return prisma.$transaction(async (tx) => {
    const { member, initialPassword } = await createMemberWithUser(tx, input);
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_CREATE,
      targetType: AUDIT_TARGET_TYPE.MEMBER,
      targetId: member.id,
      after: memberAuditFields(member)
    });
    return {
      member,
      initialPassword
    };
  });
}

export async function createMemberWithUser(
  tx: Prisma.TransactionClient,
  input: Omit<MemberInput, "jobTitle"> & {
    jobTitle?: string | null;
    managerId?: string | null;
    targetRoleId?: string | null;
  },
  // CSV の一括登録では、時間のかかるハッシュの計算をトランザクションの外で1回だけ行い、ここに渡す
  initialPasswordHash?: string
) {
  const createInitialCredential = async () => {
    if (initialPasswordHash) {
      return { passwordHash: initialPasswordHash, initialPassword: null };
    }
    const initialPassword = generateInitialPassword();
    return {
      passwordHash: await hashInitialPassword(initialPassword),
      initialPassword
    };
  };
  const member = await tx.member.create({ data: input });
  const existingUser = await tx.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      memberId: true
    }
  });

  if (existingUser) {
    assertUserCanLinkToMember(existingUser.memberId, member.id);

    await tx.user.update({
      where: { id: existingUser.id },
      data: {
        name: input.name,
        memberId: member.id
      }
    });
    return { member, initialPassword: null };
  }

  const credential = await createInitialCredential();
  await tx.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: credential.passwordHash,
      passwordChangeRequired: true,
      role: AuthRole.MEMBER,
      memberId: member.id
    }
  });

  return { member, initialPassword: credential.initialPassword };
}

export async function issueInitialPassword(
  memberId: string,
  actorMemberId: string
) {
  const initialPassword = generateInitialPassword();
  const passwordHash = await hashInitialPassword(initialPassword);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { memberId },
      data: { passwordHash, passwordChangeRequired: true }
    });
    if (updated.count === 0) {
      throw new UserFacingError("このメンバーにはログイン用の利用者がありません。");
    }
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_PASSWORD_ISSUE,
      targetType: AUDIT_TARGET_TYPE.MEMBER,
      targetId: memberId
    });
  });

  return initialPassword;
}

export async function updateMember(
  id: string,
  input: MemberInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.member.findUniqueOrThrow({ where: { id } });
    const member = await tx.member.update({ where: { id }, data: input });
    const diff = diffForAudit(
      { ...memberAuditFields(before), profile: before.profile },
      { ...memberAuditFields(member), profile: member.profile },
      { redactedFields: ["profile"] }
    );
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.MEMBER_UPDATE,
        targetType: AUDIT_TARGET_TYPE.MEMBER,
        targetId: id,
        ...diff
      });
    }
    return member;
  });
}

export async function deactivateMember(id: string, actorMemberId: string | null) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.member.findUniqueOrThrow({ where: { id }, select: { status: true } });
    const member = await tx.member.update({ where: { id }, data: { status: "INACTIVE" } });
    const diff = diffForAudit(before, { status: member.status });
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.MEMBER_DEACTIVATE,
        targetType: AUDIT_TARGET_TYPE.MEMBER,
        targetId: id,
        ...diff
      });
    }
    return member;
  });
}

export async function upsertMemberSkill(
  input: MemberSkillInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.memberSkill.findUnique({
      where: {
        memberId_skillId: {
          memberId: input.memberId,
          skillId: input.skillId
        }
      }
    });
    const changedAt = new Date();
    const memberSkill = await tx.memberSkill.upsert({
      where: {
        memberId_skillId: {
          memberId: input.memberId,
          skillId: input.skillId
        }
      },
      update: {
        level: input.level,
        lastAssessedAt: changedAt
      },
      create: {
        memberId: input.memberId,
        skillId: input.skillId,
        level: input.level,
        lastAssessedAt: changedAt
      }
    });

    if (shouldRecordSkillLevelChange(current?.level ?? null, input.level)) {
      await tx.skillLevelChange.create({
        data: {
          memberId: input.memberId,
          skillId: input.skillId,
          fromLevel: current?.level ?? null,
          toLevel: input.level,
          source: SkillLevelChangeSource.DIRECT_EDIT,
          changedByMemberId: input.changedByMemberId,
          changedAt
        }
      });
    }

    const diff = diffForAudit(
      current ? { level: current.level } : {},
      { level: memberSkill.level }
    );
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: current
          ? AUDIT_ACTION.MEMBER_SKILL_UPDATE
          : AUDIT_ACTION.MEMBER_SKILL_CREATE,
        targetType: AUDIT_TARGET_TYPE.MEMBER_SKILL,
        targetId: memberSkill.id,
        before: current ? diff.before : undefined,
        after: diff.after,
        metadata: { memberId: input.memberId, skillId: input.skillId }
      });
    }

    return memberSkill;
  });
}

export async function removeMemberSkill(
  memberId: string,
  skillId: string,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const removed = await tx.memberSkill.delete({
      where: {
        memberId_skillId: {
          memberId,
          skillId
        }
      }
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_SKILL_DELETE,
      targetType: AUDIT_TARGET_TYPE.MEMBER_SKILL,
      targetId: removed.id,
      before: { level: removed.level },
      metadata: { memberId, skillId }
    });
    return removed;
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

export async function getMemberSkillSheetContext(memberId: string) {
  const [
    member,
    latestAssessments,
    pendingAssessments,
    assessmentHistory
  ] = await Promise.all([
    prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        memberSkills: {
          select: {
            skillId: true,
            level: true
          }
        },
        targetRole: {
          select: {
            name: true,
            roleRequirements: {
              select: {
                skillId: true,
                requiredLevel: true
              }
            }
          }
        }
      }
    }),
    prisma.skillSelfAssessment.findMany({
      where: { memberId },
      select: {
        skillId: true,
        status: true,
        managerComment: true
      },
      orderBy: { createdAt: "desc" },
      distinct: ["skillId"]
    }),
    prisma.skillSelfAssessment.findMany({
      where: {
        memberId,
        status: SkillSelfAssessmentStatus.PENDING
      },
      select: {
        skillId: true,
        requestedLevel: true
      }
    }),
    prisma.skillSelfAssessment.findMany({
      where: { memberId },
      select: {
        id: true,
        requestedLevel: true,
        status: true,
        managerComment: true,
        createdAt: true,
        skill: {
          select: {
            name: true,
            category: {
              select: { name: true }
            }
          }
        },
        skillLevelChanges: {
          select: { toLevel: true },
          orderBy: { changedAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return {
    memberSkills: member.memberSkills,
    targetRoleName: member.targetRole?.name ?? null,
    targetRequirements: member.targetRole?.roleRequirements ?? [],
    pendingAssessments,
    latestAssessments,
    assessmentHistory
  };
}

function pendingSkillAssessmentWhere(
  reviewerRole: AuthRole,
  reviewerMemberId: string
): Prisma.SkillSelfAssessmentWhereInput {
  return {
    status: SkillSelfAssessmentStatus.PENDING,
    ...(reviewerRole === AuthRole.ADMIN
      ? {}
      : {
          member: {
            OR: [
              { managerId: reviewerMemberId },
              { managerId: null }
            ]
          }
        })
  };
}

export async function listPendingSkillAssessments(
  reviewerRole: AuthRole,
  reviewerMemberId: string
) {
  return prisma.skillSelfAssessment.findMany({
    where: pendingSkillAssessmentWhere(reviewerRole, reviewerMemberId),
    include: {
      member: {
        include: {
          department: true,
          memberSkills: {
            select: {
              skillId: true,
              level: true
            }
          },
          targetRole: {
            select: {
              name: true,
              roleRequirements: {
                select: {
                  skillId: true,
                  requiredLevel: true
                }
              }
            }
          }
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

export function countPendingSkillAssessments(
  reviewerRole: AuthRole,
  reviewerMemberId: string
) {
  return prisma.skillSelfAssessment.count({
    where: pendingSkillAssessmentWhere(reviewerRole, reviewerMemberId)
  });
}

export function countMemberSkillAssessments(memberId: string) {
  return prisma.skillSelfAssessment.count({ where: { memberId } });
}

export function countMemberSkills(memberId: string) {
  return prisma.memberSkill.count({ where: { memberId } });
}

export async function hasMemberTargetRole(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { targetRoleId: true }
  });
  return Boolean(member?.targetRoleId);
}

export async function createSkillAssessment(
  input: SkillAssessmentInput,
  actorMemberId: string | null
) {
  const [assessment] = await createSkillAssessments({
    memberId: input.memberId,
    assessments: [{
      skillId: input.skillId,
      requestedLevel: input.requestedLevel,
      yearsOfExperience: input.yearsOfExperience
    }]
  }, actorMemberId);

  return assessment;
}

export async function createSkillAssessments(
  input: SkillAssessmentBatchInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const skillIds = input.assessments.map((assessment) => assessment.skillId);
    const member = await tx.member.findUniqueOrThrow({
      where: { id: input.memberId },
      select: { name: true, managerId: true }
    });
    const [skills, pendingAssessments, reviewerMembers] = await Promise.all([
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
          OR: [
            ...(member.managerId ? [{ memberId: member.managerId }] : []),
            {
              role: AuthRole.ADMIN,
              member: { status: "ACTIVE" }
            }
          ],
          memberId: { not: input.memberId }
        },
        select: { memberId: true, role: true }
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
    const assessments: SkillSelfAssessment[] = [];

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

    const managerReviewer = reviewerMembers.find(
      (reviewer) => reviewer.memberId === member.managerId
    );
    const selectedReviewers = managerReviewer
      ? [managerReviewer]
      : reviewerMembers.filter((reviewer) => reviewer.role === AuthRole.ADMIN);
    const reviewerMemberIds = [
      ...new Set(
        selectedReviewers
          .map((reviewer) => reviewer.memberId)
          .filter((memberId): memberId is string => Boolean(memberId))
      )
    ];
    const assessmentLabels = assessments.map(
      (assessment) => `${skillNames.get(assessment.skillId)} Lv${assessment.requestedLevel}`
    );
    const notificationBody = assessments.length === 1
      ? `${member.name}さんが ${assessmentLabels[0]} を申請しました。`
      : `${member.name}さんから ${assessments.length}件の申請が届きました（${assessmentLabels.slice(0, 2).join("・")}${assessments.length >= 3 ? " ほか" : ""}）。`;
    const notifications = reviewerMemberIds.map((recipientMemberId) => ({
      recipientMemberId,
      type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
      skillSelfAssessmentId: assessments[0].id,
      title: "スキル申請の承認依頼",
      body: notificationBody
    }));

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    await recordAuditLogs(
      tx,
      assessments.map((assessment) => ({
        actorMemberId,
        action: AUDIT_ACTION.SKILL_ASSESSMENT_CREATE,
        targetType: AUDIT_TARGET_TYPE.SKILL_SELF_ASSESSMENT,
        targetId: assessment.id,
        after: {
          memberId: assessment.memberId,
          skillId: assessment.skillId,
          requestedLevel: assessment.requestedLevel,
          yearsOfExperience: assessment.yearsOfExperience
        }
      }))
    );

    return assessments;
  });
}

async function reviewSkillAssessmentInTransaction(
  tx: Prisma.TransactionClient,
  input: SkillAssessmentReviewInput
) {
    const assessment = await tx.skillSelfAssessment.findUnique({
      where: { id: input.assessmentId },
      include: {
        member: true,
        skill: true
      }
    });

    if (!assessment) {
      throw new UserFacingError(
        `申請（ID: ${input.assessmentId}）が見つかりません。`
      );
    }

    const assessmentLabel = `${assessment.member.name} / ${assessment.skill.name}（申請ID: ${assessment.id}）`;

    if (assessment.status !== SkillSelfAssessmentStatus.PENDING) {
      throw new UserFacingError(
        `${assessmentLabel}は承認待ちではありません。`
      );
    }

    if (!canReviewSkillAssessment({
      reviewerRole: input.reviewerRole,
      reviewerMemberId: input.reviewerMemberId,
      applicantManagerId: assessment.member.managerId
    })) {
      throw new UserFacingError(
        `${assessmentLabel}を承認する権限がありません。`
      );
    }

    const reviewStatus =
      input.status === SkillSelfAssessmentStatus.CORRECTED &&
      input.correctedLevel === assessment.requestedLevel
        ? SkillSelfAssessmentStatus.APPROVED
        : input.status;

    const approvedLevel =
      reviewStatus === SkillSelfAssessmentStatus.CORRECTED
        ? input.correctedLevel
        : assessment.requestedLevel;

    const reviewedAt = new Date();
    if (reviewStatus !== SkillSelfAssessmentStatus.REJECTED && approvedLevel) {
      const currentMemberSkill = await tx.memberSkill.findUnique({
        where: {
          memberId_skillId: {
            memberId: assessment.memberId,
            skillId: assessment.skillId
          }
        }
      });
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
          approvedAt: reviewedAt,
          lastAssessedAt: reviewedAt
        },
        create: {
          memberId: assessment.memberId,
          skillId: assessment.skillId,
          level: approvedLevel,
          yearsOfExperience: assessment.yearsOfExperience,
          approvedByMemberId: input.reviewerMemberId,
          approvedAt: reviewedAt,
          lastAssessedAt: reviewedAt
        }
      });
      if (shouldRecordSkillLevelChange(currentMemberSkill?.level ?? null, approvedLevel)) {
        await tx.skillLevelChange.create({
          data: {
            memberId: assessment.memberId,
            skillId: assessment.skillId,
            fromLevel: currentMemberSkill?.level ?? null,
            toLevel: approvedLevel,
            source: reviewStatus === SkillSelfAssessmentStatus.CORRECTED
              ? SkillLevelChangeSource.ASSESSMENT_CORRECTED
              : SkillLevelChangeSource.ASSESSMENT_APPROVED,
            skillSelfAssessmentId: assessment.id,
            changedByMemberId: input.reviewerMemberId,
            changedAt: reviewedAt
          }
        });
      }
    }

    const reviewedAssessment = await tx.skillSelfAssessment.update({
      where: { id: input.assessmentId },
      data: {
        status: reviewStatus,
        managerComment: input.managerComment,
        reviewedByMemberId: input.reviewerMemberId,
        reviewedAt
      }
    });
    const remainingPendingAssessments = await tx.skillSelfAssessment.count({
      where: {
        memberId: assessment.memberId,
        status: SkillSelfAssessmentStatus.PENDING
      }
    });
    if (remainingPendingAssessments === 0) {
      await tx.notification.updateMany({
        where: {
          type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
          status: NotificationStatus.UNREAD,
          skillSelfAssessment: { memberId: assessment.memberId }
        },
        data: {
          status: NotificationStatus.READ,
          readAt: reviewedAt
        }
      });
    }
    const notificationType =
      reviewStatus === SkillSelfAssessmentStatus.APPROVED
        ? NotificationType.SKILL_ASSESSMENT_APPROVED
        : reviewStatus === SkillSelfAssessmentStatus.CORRECTED
          ? NotificationType.SKILL_ASSESSMENT_CORRECTED
          : NotificationType.SKILL_ASSESSMENT_REJECTED;

    const resultBody = reviewStatus === SkillSelfAssessmentStatus.APPROVED
      ? `${assessment.skill.name} Lv.${assessment.requestedLevel} の申請が承認されました。`
      : reviewStatus === SkillSelfAssessmentStatus.CORRECTED
        ? `${assessment.skill.name} の申請が Lv${approvedLevel} に補正して承認されました。`
        : input.managerComment
          ? `${assessment.skill.name} の申請が差し戻されました。理由：${input.managerComment}`
          : `${assessment.skill.name} の申請が差し戻されました。`;

    await tx.notification.create({
      data: {
        recipientMemberId: assessment.memberId,
        type: notificationType,
        skillSelfAssessmentId: assessment.id,
        title: "スキル申請の承認結果",
        body: resultBody
      }
    });

    const action = reviewStatus === SkillSelfAssessmentStatus.APPROVED
      ? AUDIT_ACTION.SKILL_ASSESSMENT_APPROVE
      : reviewStatus === SkillSelfAssessmentStatus.CORRECTED
        ? AUDIT_ACTION.SKILL_ASSESSMENT_CORRECT
        : AUDIT_ACTION.SKILL_ASSESSMENT_REJECT;
    await recordAuditLog(tx, {
      actorMemberId: input.reviewerMemberId,
      action,
      targetType: AUDIT_TARGET_TYPE.SKILL_SELF_ASSESSMENT,
      targetId: assessment.id,
      before: { status: assessment.status },
      after: { status: reviewedAssessment.status },
      metadata: {
        memberId: assessment.memberId,
        skillId: assessment.skillId,
        requestedLevel: assessment.requestedLevel,
        approvedLevel: reviewStatus === SkillSelfAssessmentStatus.REJECTED
          ? null
          : approvedLevel,
        comment: input.managerComment ?? null
      }
    });

    return reviewedAssessment;
}

export async function reviewSkillAssessment(input: SkillAssessmentReviewInput) {
  return prisma.$transaction((tx) =>
    reviewSkillAssessmentInTransaction(tx, input)
  );
}

export async function approveSkillAssessments(
  input: SkillAssessmentApprovalBatchInput
) {
  return prisma.$transaction(async (tx) => {
    const approvedAssessments = [];

    for (const assessmentId of input.assessmentIds) {
      approvedAssessments.push(
        await reviewSkillAssessmentInTransaction(tx, {
          assessmentId,
          reviewerMemberId: input.reviewerMemberId,
          reviewerRole: input.reviewerRole,
          status: SkillSelfAssessmentStatus.APPROVED
        })
      );
    }

    return approvedAssessments;
  });
}

export async function updateMemberManager(
  input: MemberManagerInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.member.findUniqueOrThrow({ where: { id: input.memberId } });
    if (input.managerId) {
      const manager = await tx.member.findFirst({
        where: {
          id: input.managerId,
          status: "ACTIVE",
          users: {
            some: { role: { in: [AuthRole.ADMIN, AuthRole.MANAGER] } }
          }
        },
        select: { id: true }
      });
      if (!manager) {
        throw new UserFacingError("上司には在籍中のマネージャーまたは管理者を指定してください。");
      }
    }
    const assignments = await tx.member.findMany({
      select: { id: true, managerId: true }
    });
    if (createsManagerCycle(input.memberId, input.managerId, assignments)) {
      throw new UserFacingError("自分自身または循環する上司関係は設定できません。");
    }
    const member = await tx.member.update({
      where: { id: input.memberId },
      data: { managerId: input.managerId }
    });
    const diff = diffForAudit({ managerId: before.managerId }, { managerId: member.managerId });
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.MEMBER_MANAGER_UPDATE,
        targetType: AUDIT_TARGET_TYPE.MEMBER,
        targetId: input.memberId,
        ...diff
      });
    }
    return member;
  });
}

export async function updateMemberTargetRole(
  input: MemberTargetRoleInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.member.findUniqueOrThrow({
      where: { id: input.memberId }
    });
    if (input.targetRoleId) {
      const role = await tx.role.findFirst({
        where: { id: input.targetRoleId, isActive: true },
        select: { id: true }
      });
      if (!role) {
        throw new UserFacingError("目標ロールには有効なロールを指定してください。");
      }
    }
    const member = await tx.member.update({
      where: { id: input.memberId },
      data: { targetRoleId: input.targetRoleId }
    });
    const diff = diffForAudit(
      { targetRoleId: before.targetRoleId },
      { targetRoleId: member.targetRoleId }
    );
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.MEMBER_TARGET_ROLE_UPDATE,
        targetType: AUDIT_TARGET_TYPE.MEMBER,
        targetId: input.memberId,
        ...diff
      });
    }
    return member;
  });
}
