import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  Prisma,
  PrismaClient,
  AuthRole,
  LevelUpReactionType,
  MemberStatus,
  NotificationType,
  SkillLevelChangeSource,
  SkillSelfAssessmentStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { readDemoSeedPasswords } from "./seed-config";
import {
  buildSkillAssessmentRequestNotificationBody,
  demoDepartments,
  demoMembers,
  demoManagerAssignments,
  demoMemberSkills,
  demoLevelUpComments,
  demoLevelUpReactions,
  demoRoles,
  demoSkillLevelChanges,
  demoSkillAssessments,
  demoSkillCategories,
  demoSkills,
  demoTargetRoleAssignments,
  existingDemoMemberEmployeeNos
} from "./seed-demo-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })
});

const skillLevels = [
  {
    level: 1,
    label: "Beginner",
    description: "基本概念を理解し、支援を受けて作業できる"
  },
  {
    level: 2,
    label: "Basic",
    description: "定型作業を自力で進められる"
  },
  {
    level: 3,
    label: "Intermediate",
    description: "通常業務で実用でき、周囲へ説明できる"
  },
  {
    level: 4,
    label: "Advanced",
    description: "複雑な課題を解決し、設計や改善を主導できる"
  },
  {
    level: 5,
    label: "Expert",
    description: "組織横断で標準化、育成、技術判断をリードできる"
  }
];

function requireId(
  idsByBusinessKey: ReadonlyMap<string, string>,
  businessKey: string,
  entityName: string
) {
  const id = idsByBusinessKey.get(businessKey);
  if (!id) {
    throw new Error(`${entityName} not found for demo seed: ${businessKey}`);
  }
  return id;
}

async function main() {
  const demoPasswords = readDemoSeedPasswords();
  const passwordHashes = {
    ADMIN: await bcrypt.hash(demoPasswords.admin, 12),
    MANAGER: await bcrypt.hash(demoPasswords.manager, 12),
    MEMBER: await bcrypt.hash(demoPasswords.member, 12)
  } satisfies Record<AuthRole, string>;

  await prisma.$transaction(async (tx) => {
    for (const level of skillLevels) {
      await tx.skillLevel.upsert({
        where: { level: level.level },
        update: level,
        create: level
      });
    }

    const department = await tx.department.upsert({
      where: { code: "DEV" },
      update: {
        name: "開発部",
        isActive: true
      },
      create: {
        code: "DEV",
        name: "開発部",
        isActive: true
      }
    });

    const members = [
      {
        employeeNo: "TM0001",
        name: "Admin User",
        email: "admin@example.com",
        jobTitle: "System Admin",
        role: AuthRole.ADMIN
      },
      {
        employeeNo: "TM0002",
        name: "Manager User",
        email: "manager@example.com",
        jobTitle: "Engineering Manager",
        role: AuthRole.MANAGER
      },
      {
        employeeNo: "TM0003",
        name: "Member User",
        email: "member@example.com",
        jobTitle: "Engineer",
        role: AuthRole.MEMBER
      }
    ];

    for (const memberInput of members) {
      const member = await tx.member.upsert({
        where: { employeeNo: memberInput.employeeNo },
        update: {
          name: memberInput.name,
          email: memberInput.email,
          departmentId: department.id,
          jobTitle: memberInput.jobTitle,
          status: MemberStatus.ACTIVE
        },
        create: {
          employeeNo: memberInput.employeeNo,
          name: memberInput.name,
          email: memberInput.email,
          departmentId: department.id,
          jobTitle: memberInput.jobTitle,
          status: MemberStatus.ACTIVE
        }
      });

      const existingUser = await tx.user.findUnique({
        where: { email: memberInput.email },
        select: { id: true }
      });

      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: memberInput.name,
            role: memberInput.role,
            memberId: member.id
          }
        });
        continue;
      }

      await tx.user.create({
        data: {
          email: memberInput.email,
          name: memberInput.name,
          passwordHash: passwordHashes[memberInput.role],
          role: memberInput.role,
          memberId: member.id
        }
      });
    }
  });

  await prisma.$transaction(async (tx) => {
    for (const department of demoDepartments) {
      await tx.department.upsert({
        where: { code: department.code },
        update: {},
        create: {
          ...department,
          isActive: true
        }
      });
    }

    for (const category of demoSkillCategories) {
      await tx.skillCategory.upsert({
        where: { name: category.name },
        update: {},
        create: category
      });
    }

    const categories = await tx.skillCategory.findMany({
      where: {
        name: { in: demoSkillCategories.map((category) => category.name) }
      },
      select: { id: true, name: true }
    });
    const categoryIdsByName = new Map(
      categories.map((category) => [category.name, category.id])
    );

    for (const skill of demoSkills) {
      await tx.skill.upsert({
        where: { code: skill.code },
        update: {},
        create: {
          code: skill.code,
          name: skill.name,
          description: skill.description,
          categoryId: requireId(
            categoryIdsByName,
            skill.categoryName,
            "SkillCategory"
          ),
          isActive: true
        }
      });
    }

    for (const role of demoRoles) {
      await tx.role.upsert({
        where: { name: role.name },
        update: {},
        create: {
          name: role.name,
          description: role.description,
          isActive: true
        }
      });
    }

    const departmentCodes = [
      "DEV",
      ...demoDepartments.map((department) => department.code)
    ];
    const departments = await tx.department.findMany({
      where: { code: { in: departmentCodes } },
      select: { id: true, code: true }
    });
    const departmentIdsByCode = new Map(
      departments.map((department) => [department.code, department.id])
    );

    for (const member of demoMembers) {
      await tx.member.upsert({
        where: { employeeNo: member.employeeNo },
        update: {},
        create: {
          employeeNo: member.employeeNo,
          name: member.name,
          email: member.email,
          departmentId: requireId(
            departmentIdsByCode,
            member.departmentCode,
            "Department"
          ),
          status: member.status,
          jobTitle: member.jobTitle
        }
      });
    }

    const skills = await tx.skill.findMany({
      where: { code: { in: demoSkills.map((skill) => skill.code) } },
      select: { id: true, code: true, name: true }
    });
    const skillIdsByCode = new Map(
      skills.map((skill) => [skill.code, skill.id])
    );
    const skillNamesByCode = new Map(
      skills.map((skill) => [skill.code, skill.name])
    );

    const roles = await tx.role.findMany({
      where: { name: { in: demoRoles.map((role) => role.name) } },
      select: { id: true, name: true }
    });
    const roleIdsByName = new Map(roles.map((role) => [role.name, role.id]));

    for (const role of demoRoles) {
      const roleId = requireId(roleIdsByName, role.name, "Role");
      for (const requirement of role.requirements) {
        const skillId = requireId(
          skillIdsByCode,
          requirement.skillCode,
          "Skill"
        );
        await tx.roleRequirement.upsert({
          where: {
            roleId_skillId: { roleId, skillId }
          },
          update: {},
          create: {
            roleId,
            skillId,
            requiredLevel: requirement.requiredLevel,
            isRequired: requirement.isRequired
          }
        });
      }
    }

    const allDemoEmployeeNos = [
      ...existingDemoMemberEmployeeNos,
      ...demoMembers.map((member) => member.employeeNo)
    ];
    const members = await tx.member.findMany({
      where: { employeeNo: { in: allDemoEmployeeNos } },
      select: { id: true, employeeNo: true, name: true }
    });
    const memberIdsByEmployeeNo = new Map(
      members.map((member) => [member.employeeNo, member.id])
    );
    const memberNamesByEmployeeNo = new Map(
      members.map((member) => [member.employeeNo, member.name])
    );

    for (const assignment of demoManagerAssignments) {
      await tx.member.updateMany({
        where: {
          id: requireId(memberIdsByEmployeeNo, assignment.employeeNo, "Member"),
          managerId: null
        },
        data: {
          managerId: requireId(
            memberIdsByEmployeeNo,
            assignment.managerEmployeeNo,
            "Manager member"
          )
        }
      });
    }

    for (const assignment of demoTargetRoleAssignments) {
      await tx.member.updateMany({
        where: {
          id: requireId(memberIdsByEmployeeNo, assignment.employeeNo, "Member"),
          targetRoleId: null
        },
        data: {
          targetRoleId: requireId(roleIdsByName, assignment.roleName, "Role")
        }
      });
    }

    const approvingMemberId = requireId(
      memberIdsByEmployeeNo,
      "TM0002",
      "Member"
    );
    const approvedAt = new Date("2026-09-15T00:00:00.000Z");
    const lastAssessedAt = new Date("2026-09-15T00:00:00.000Z");

    for (const memberSkill of demoMemberSkills) {
      const memberId = requireId(
        memberIdsByEmployeeNo,
        memberSkill.employeeNo,
        "Member"
      );
      const skillId = requireId(
        skillIdsByCode,
        memberSkill.skillCode,
        "Skill"
      );
      await tx.memberSkill.upsert({
        where: {
          memberId_skillId: { memberId, skillId }
        },
        update: {},
        create: {
          memberId,
          skillId,
          level: memberSkill.level,
          yearsOfExperience: new Prisma.Decimal(
            memberSkill.yearsOfExperience
          ),
          approvedByMemberId: approvingMemberId,
          approvedAt,
          lastAssessedAt
        }
      });
    }

    const levelChangeEmployeeNos = [
      ...new Set(demoSkillLevelChanges.map((change) => change.employeeNo))
    ];
    const membersWithDemoHistoryCreated = new Set<string>();
    for (const employeeNo of levelChangeEmployeeNos) {
      const memberId = requireId(memberIdsByEmployeeNo, employeeNo, "Member");
      const existingNonBackfillLevelChange = await tx.skillLevelChange.findFirst({
        where: {
          memberId,
          source: { not: SkillLevelChangeSource.BACKFILL }
        },
        select: { id: true }
      });
      if (existingNonBackfillLevelChange) {
        continue;
      }

      const demoChanges = demoSkillLevelChanges.filter(
        (candidate) => candidate.employeeNo === employeeNo
      );
      const demoSkillIds = demoChanges.map((change) =>
        requireId(skillIdsByCode, change.skillCode, "Skill")
      );
      await tx.skillLevelChange.deleteMany({
        where: {
          memberId,
          skillId: { in: demoSkillIds },
          source: SkillLevelChangeSource.BACKFILL
        }
      });

      const managerEmployeeNo = demoManagerAssignments.find(
        (assignment) => assignment.employeeNo === employeeNo
      )?.managerEmployeeNo;
      if (!managerEmployeeNo) {
        throw new Error(`Manager not found for demo level changes: ${employeeNo}`);
      }
      const changedByMemberId = requireId(
        memberIdsByEmployeeNo,
        managerEmployeeNo,
        "Manager member"
      );

      for (const change of demoChanges) {
        await tx.skillLevelChange.create({
          data: {
            memberId,
            skillId: requireId(skillIdsByCode, change.skillCode, "Skill"),
            fromLevel: change.fromLevel,
            toLevel: change.toLevel,
            source: SkillLevelChangeSource.ASSESSMENT_APPROVED,
            changedByMemberId,
            changedAt: new Date(change.changedAt)
          }
        });
      }
      membersWithDemoHistoryCreated.add(memberId);
    }

    for (const reaction of demoLevelUpReactions) {
      const levelChangeMemberId = requireId(
        memberIdsByEmployeeNo,
        reaction.levelChangeEmployeeNo,
        "Member"
      );
      if (!membersWithDemoHistoryCreated.has(levelChangeMemberId)) {
        continue;
      }
      const levelChange = await tx.skillLevelChange.findFirst({
        where: {
          memberId: levelChangeMemberId,
          skillId: requireId(skillIdsByCode, reaction.skillCode, "Skill")
        },
        orderBy: { changedAt: "desc" },
        select: { id: true }
      });
      if (!levelChange) {
        continue;
      }
      await tx.levelUpReaction.upsert({
        where: {
          levelChangeId_memberId_type: {
            levelChangeId: levelChange.id,
            memberId: requireId(
              memberIdsByEmployeeNo,
              reaction.memberEmployeeNo,
              "Reaction member"
            ),
            type: reaction.type as LevelUpReactionType
          }
        },
        update: {},
        create: {
          levelChangeId: levelChange.id,
          memberId: requireId(
            memberIdsByEmployeeNo,
            reaction.memberEmployeeNo,
            "Reaction member"
          ),
          type: reaction.type as LevelUpReactionType
        }
      });
    }

    for (const comment of demoLevelUpComments) {
      const levelChangeMemberId = requireId(
        memberIdsByEmployeeNo,
        comment.levelChangeEmployeeNo,
        "Member"
      );
      if (!membersWithDemoHistoryCreated.has(levelChangeMemberId)) {
        continue;
      }
      const levelChange = await tx.skillLevelChange.findFirst({
        where: {
          memberId: levelChangeMemberId,
          skillId: requireId(skillIdsByCode, comment.skillCode, "Skill")
        },
        orderBy: { changedAt: "desc" },
        select: { id: true }
      });
      if (!levelChange) {
        continue;
      }
      const authorMemberId = requireId(
        memberIdsByEmployeeNo,
        comment.authorEmployeeNo,
        "Comment author"
      );
      const existingComment = await tx.levelUpComment.findFirst({
        where: {
          levelChangeId: levelChange.id,
          authorMemberId,
          body: comment.body
        },
        select: { id: true }
      });
      if (!existingComment) {
        await tx.levelUpComment.create({
          data: {
            levelChangeId: levelChange.id,
            authorMemberId,
            body: comment.body
          }
        });
      }
    }

    const assessmentMemberId = requireId(
      memberIdsByEmployeeNo,
      "TM0003",
      "Member"
    );
    const existingAssessment = await tx.skillSelfAssessment.findFirst({
      where: { memberId: assessmentMemberId },
      select: { id: true }
    });

    if (!existingAssessment) {
      const assessmentMember = await tx.member.findUniqueOrThrow({
        where: { id: assessmentMemberId },
        select: { managerId: true }
      });
      const reviewerUsers = await tx.user.findMany({
        where: assessmentMember.managerId
          ? {
              OR: [
                { role: AuthRole.ADMIN },
                { memberId: assessmentMember.managerId }
              ],
              memberId: { not: null }
            }
          : {
              role: { in: [AuthRole.ADMIN, AuthRole.MANAGER] },
              memberId: { not: null }
            },
        select: { memberId: true }
      });
      const recipientMemberIds = reviewerUsers
        .map((user) => user.memberId)
        .filter((memberId): memberId is string => Boolean(memberId));
      const assessmentMemberName = requireId(
        memberNamesByEmployeeNo,
        "TM0003",
        "Member name"
      );

      for (const assessment of demoSkillAssessments) {
        const skillId = requireId(
          skillIdsByCode,
          assessment.skillCode,
          "Skill"
        );
        const createdAssessment = await tx.skillSelfAssessment.create({
          data: {
            memberId: assessmentMemberId,
            skillId,
            requestedLevel: assessment.requestedLevel,
            yearsOfExperience: new Prisma.Decimal(
              assessment.yearsOfExperience
            ),
            status: SkillSelfAssessmentStatus.PENDING
          }
        });
        const skillName = requireId(
          skillNamesByCode,
          assessment.skillCode,
          "Skill name"
        );

        if (recipientMemberIds.length > 0) {
          await tx.notification.createMany({
            data: recipientMemberIds.map((recipientMemberId) => ({
              recipientMemberId,
              type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
              skillSelfAssessmentId: createdAssessment.id,
              title: "スキル申告の承認依頼",
              body: buildSkillAssessmentRequestNotificationBody(
                assessmentMemberName,
                skillName,
                assessment.requestedLevel
              )
            }))
          });
        }
      }
    }
  }, { timeout: 60_000 });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
