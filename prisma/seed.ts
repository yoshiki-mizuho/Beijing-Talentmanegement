import "dotenv/config";

import {
  Prisma,
  LevelUpReactionType,
  MemberStatus,
  ProposalSheetDraftSource,
  SkillLevelChangeSource,
  SkillPrerequisiteSource,
  SkillSelfAssessmentStatus,
  TeamGoalKind,
} from "@prisma/client";

import { prisma, runWithTenant } from "../src/server/db/prisma";
import { generateNextRoleCodeFromExistingCodes } from "../src/modules/roles/domain/role-code";
import { assertDemoSeedAllowed } from "./seed-config";
import {
  demoLevelUpComments,
  demoLevelUpReactions,
  demoMemberProfiles,
  demoMembers,
  demoMemberSkills,
  demoRoles,
  demoSkillAssessments,
  demoSkillCategoryGroups,
  demoSkillCategories,
  demoSkillLevelChanges,
  demoSkillPrerequisites,
  demoSkills,
  demoTargetRoleAssignments,
} from "./seed-demo-data";

assertDemoSeedAllowed(process.env.DATABASE_URL, process.env.ALLOW_DEMO_SEED);

const seedTenantId =
  process.env.SEED_TENANT_ID ?? "11111111-1111-4111-8111-111111111111";
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
  await prisma.$transaction(async (tx) => {
    for (const level of skillLevels) {
      await tx.skillLevel.upsert({
        where: { level: level.level },
        update: { label: level.label },
        create: level
      });
    }

    for (const category of demoSkillCategories) {
      const existing = await tx.skillCategory.findFirst({
        where: { name: category.name },
        select: { id: true }
      });
      if (!existing) await tx.skillCategory.create({ data: category });
    }

    for (const group of demoSkillCategoryGroups) {
      const existing = await tx.skillCategoryGroup.findFirst({
        where: { name: group.name },
        select: { id: true }
      });
      const categoryGroup = existing ?? await tx.skillCategoryGroup.create({
        data: { name: group.name, displayOrder: group.displayOrder }
      });
      await tx.skillCategory.updateMany({
        where: {
          name: { in: [...group.categoryNames] },
          groupId: null
        },
        data: { groupId: categoryGroup.id }
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
      const existing = await tx.skill.findFirst({
        where: { code: skill.code },
        select: { id: true }
      });
      if (!existing) {
        await tx.skill.create({
          data: {
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
    }

    const roleCodes = (await tx.role.findMany({ select: { code: true } }))
      .map((role) => role.code);
    for (const role of demoRoles) {
      const existingRole = await tx.role.findFirst({
        where: { name: role.name },
        select: { id: true }
      });
      if (!existingRole) {
        const code = generateNextRoleCodeFromExistingCodes(roleCodes);
        await tx.role.create({
          data: {
            code,
            name: role.name,
            description: role.description,
            isActive: true
          }
        });
        roleCodes.push(code);
      }
    }

    for (const member of demoMembers) {
      await tx.member.upsert({
        where: {
          tenantId_platformUserId: {
            tenantId: seedTenantId,
            platformUserId: member.platformUserId
          }
        },
        update: { status: member.status as MemberStatus },
        create: {
          platformUserId: member.platformUserId,
          status: member.status as MemberStatus
        }
      });
    }

    const skills = await tx.skill.findMany({
      where: { code: { in: demoSkills.map((skill) => skill.code) } },
      select: { id: true, code: true, name: true }
    });
    const skillIds = new Map(skills.map((skill) => [skill.code, skill.id]));
    const skillIdsByName = new Map(
      skills.map((skill) => [skill.name, skill.id])
    );

    await tx.skillPrerequisite.createMany({
      data: demoSkillPrerequisites.map((prerequisite) => ({
        skillId: requireId(skillIdsByName, prerequisite.skillName, "Skill"),
        prerequisiteSkillId: requireId(
          skillIdsByName,
          prerequisite.prerequisiteSkillName,
          "Skill"
        ),
        source: SkillPrerequisiteSource.MANUAL
      })),
      skipDuplicates: true
    });

    const roles = await tx.role.findMany({
      where: { name: { in: demoRoles.map((role) => role.name) } },
      select: { id: true, name: true }
    });
    const roleIds = new Map(roles.map((role) => [role.name, role.id]));

    for (const role of demoRoles) {
      const roleId = requireId(roleIds, role.name, "Role");
      for (const requirement of role.requirements) {
        const skillId = requireId(skillIds, requirement.skillCode, "Skill");
        const existing = await tx.roleRequirement.findFirst({
          where: { roleId, skillId },
          select: { id: true }
        });
        if (!existing) {
          await tx.roleRequirement.create({
            data: {
              roleId,
              skillId,
              requiredLevel: requirement.requiredLevel,
              isRequired: requirement.isRequired,
              anyOfGroup:
                "anyOfGroup" in requirement ? requirement.anyOfGroup : null
            }
          });
        }
      }
    }

    const members = await tx.member.findMany({
      where: {
        platformUserId: {
          in: demoMembers.map((member) => member.platformUserId)
        }
      },
      select: { id: true, platformUserId: true }
    });
    const memberIds = new Map(members.map((item) => [item.platformUserId, item.id]));

    for (const profile of demoMemberProfiles) {
      const memberId = requireId(memberIds, profile.platformUserId, "Member");
      await tx.member.updateMany({
        where: { id: memberId, profileMessage: null },
        data: { profileMessage: profile.profileMessage }
      });
      await tx.member.updateMany({
        where: { id: memberId, consultTopics: { isEmpty: true } },
        data: { consultTopics: [...profile.consultTopics] }
      });
    }

    const approvingMemberId = requireId(
      memberIds,
      "22222222-2222-4222-8222-000000000004",
      "Approving member"
    );
    const approvedAt = new Date("2026-09-15T00:00:00.000Z");
    const lastAssessedAt = new Date("2026-09-15T00:00:00.000Z");

    for (const item of demoMemberSkills) {
      const memberId = requireId(memberIds, item.platformUserId, "Member");
      const skillId = requireId(skillIds, item.skillCode, "Skill");
      const existing = await tx.memberSkill.findFirst({
        where: { memberId, skillId },
        select: { id: true }
      });
      if (!existing) {
        await tx.memberSkill.create({
          data: {
            memberId,
            skillId,
            level: item.level,
            yearsOfExperience: new Prisma.Decimal(item.yearsOfExperience),
            approvedByMemberId: approvingMemberId,
            approvedAt,
            lastAssessedAt
          }
        });
      }
    }

    for (const item of demoTargetRoleAssignments) {
      await tx.member.updateMany({
        where: {
          id: requireId(memberIds, item.platformUserId, "Member"),
          targetRoleId: null
        },
        data: { targetRoleId: requireId(roleIds, item.roleName, "Role") }
      });
    }

    for (const item of demoSkillLevelChanges) {
      const memberId = requireId(memberIds, item.platformUserId, "Member");
      const skillId = requireId(skillIds, item.skillCode, "Skill");
      const changedAt = new Date(item.changedAt);
      const existing = await tx.skillLevelChange.findFirst({
        where: { memberId, skillId, changedAt },
        select: { id: true }
      });
      if (!existing) {
        await tx.skillLevelChange.create({
          data: {
            memberId,
            skillId,
            fromLevel: item.fromLevel,
            toLevel: item.toLevel,
            source: SkillLevelChangeSource.ASSESSMENT_APPROVED,
            changedByMemberId: approvingMemberId,
            changedAt
          }
        });
      }
    }

    for (const reaction of demoLevelUpReactions) {
      const levelChange = await tx.skillLevelChange.findFirst({
        where: {
          memberId: requireId(
            memberIds,
            reaction.levelChangePlatformUserId,
            "Member"
          ),
          skillId: requireId(skillIds, reaction.skillCode, "Skill")
        },
        orderBy: { changedAt: "desc" },
        select: { id: true }
      });
      if (!levelChange) continue;
      const memberId = requireId(
        memberIds,
        reaction.memberPlatformUserId,
        "Reaction member"
      );
      const type = reaction.type as LevelUpReactionType;
      const existing = await tx.levelUpReaction.findFirst({
        where: { levelChangeId: levelChange.id, memberId, type },
        select: { id: true }
      });
      if (!existing) {
        await tx.levelUpReaction.create({
          data: { levelChangeId: levelChange.id, memberId, type }
        });
      }
    }

    for (const comment of demoLevelUpComments) {
      const levelChange = await tx.skillLevelChange.findFirst({
        where: {
          memberId: requireId(
            memberIds,
            comment.levelChangePlatformUserId,
            "Member"
          ),
          skillId: requireId(skillIds, comment.skillCode, "Skill")
        },
        orderBy: { changedAt: "desc" },
        select: { id: true }
      });
      if (!levelChange) continue;
      const authorMemberId = requireId(
        memberIds,
        comment.authorPlatformUserId,
        "Comment author"
      );
      const existing = await tx.levelUpComment.findFirst({
        where: {
          levelChangeId: levelChange.id,
          authorMemberId,
          body: comment.body
        },
        select: { id: true }
      });
      if (!existing) {
        await tx.levelUpComment.create({
          data: {
            levelChangeId: levelChange.id,
            authorMemberId,
            body: comment.body
          }
        });
      }
    }

    for (const assessment of demoSkillAssessments) {
      const memberId = requireId(memberIds, assessment.platformUserId, "Member");
      const skillId = requireId(skillIds, assessment.skillCode, "Skill");
      const existing = await tx.skillSelfAssessment.findFirst({
        where: { memberId, skillId },
        select: { id: true }
      });
      if (!existing) {
        await tx.skillSelfAssessment.create({
          data: {
            memberId,
            skillId,
            requestedLevel: assessment.requestedLevel,
            yearsOfExperience: new Prisma.Decimal(
              assessment.yearsOfExperience
            ),
            status: SkillSelfAssessmentStatus.PENDING
          }
        });
      }
    }

    const leaderId = requireId(
      memberIds,
      "22222222-2222-4222-8222-000000000004",
      "Team leader"
    );
    if (await tx.teamGoal.count({ where: { managerId: leaderId } }) === 0) {
      await tx.teamGoal.create({
        data: {
          managerId: leaderId,
          kind: TeamGoalKind.LEVEL_UP_COUNT,
          targetCount: 4,
          note: "チームで成長を重ねる",
          startMonth: "2026-11",
          months: 3
        }
      });
    }

    const uiLeaderId = memberIds.get(demoMembers[3].platformUserId);
    const uiMemberId = memberIds.get(demoMembers[4].platformUserId);
    const platformLeaderId = memberIds.get(demoMembers[5].platformUserId);
    const platformMemberId = memberIds.get(demoMembers[6].platformUserId);
    const salesLeaderId = memberIds.get(demoMembers[7].platformUserId);
    const salesMemberId = memberIds.get(demoMembers[8].platformUserId);
    const reactSkillId = skillIds.get("DEMO-SKILL-001");
    const platformSkillId = skillIds.get("DEMO-SKILL-003");

    if (uiMemberId) {
      const projectTitle = "顧客ポータル刷新";
      if (!await tx.memberProjectHistory.findFirst({ where: { memberId: uiMemberId, title: projectTitle } })) {
        await tx.memberProjectHistory.create({
          data: {
            memberId: uiMemberId,
            title: projectTitle,
            startMonth: "2025-04",
            endMonth: "2026-03",
            industry: "情報通信",
            summary: "顧客向けポータルの画面設計と実装を担当",
            role: "フロントエンドエンジニア",
            teamSize: "6名",
            businessArea: "顧客接点",
            phases: ["設計", "実装", "テスト"],
            technologies: ["TypeScript", "React"],
          },
        });
      }
      const certificationName = "応用情報技術者";
      if (!await tx.memberCertification.findFirst({ where: { memberId: uiMemberId, name: certificationName } })) {
        await tx.memberCertification.create({
          data: { memberId: uiMemberId, name: certificationName, acquiredMonth: "2025-10" },
        });
      }
    }

    if (platformMemberId && platformSkillId &&
        !await tx.skillSelfAssessment.findFirst({ where: { memberId: platformMemberId, skillId: platformSkillId } })) {
      await tx.skillSelfAssessment.create({
        data: {
          memberId: platformMemberId,
          skillId: platformSkillId,
          requestedLevel: 4,
          yearsOfExperience: 3,
          status: SkillSelfAssessmentStatus.PENDING,
          applicantComment: "運用改善を主導できるレベルを目指しています",
        },
      });
    }

    const uiLevelChange = uiMemberId && reactSkillId
      ? await tx.skillLevelChange.findFirst({
          where: { memberId: uiMemberId, skillId: reactSkillId, fromLevel: 2, toLevel: 3 },
        })
      : null;
    if (uiLevelChange && uiLeaderId) {
      await tx.levelUpReaction.upsert({
        where: {
          tenantId_levelChangeId_memberId_type: {
            tenantId: seedTenantId,
            levelChangeId: uiLevelChange.id,
            memberId: uiLeaderId,
            type: LevelUpReactionType.CONGRATS,
          },
        },
        update: {},
        create: {
          levelChangeId: uiLevelChange.id,
          memberId: uiLeaderId,
          type: LevelUpReactionType.CONGRATS,
        },
      });
      const body = "実務での成長が成果につながっています";
      if (!await tx.levelUpComment.findFirst({
        where: { levelChangeId: uiLevelChange.id, authorMemberId: uiLeaderId, body },
      })) {
        await tx.levelUpComment.create({
          data: { levelChangeId: uiLevelChange.id, authorMemberId: uiLeaderId, body },
        });
      }
    }

    if (uiLeaderId && uiMemberId) {
      const message = "次の画面改善も一緒に進めましょう";
      if (!await tx.cheer.findFirst({ where: { fromMemberId: uiLeaderId, toMemberId: uiMemberId, message } })) {
        await tx.cheer.create({
          data: { fromMemberId: uiLeaderId, toMemberId: uiMemberId, message, targetSkillId: reactSkillId },
        });
      }
      const body = "次期案件では設計レビューを任せる。React の設計判断を言語化する。";
      if (!await tx.oneOnOneNote.findFirst({
        where: { managerMemberId: uiLeaderId, memberId: uiMemberId, body },
      })) {
        await tx.oneOnOneNote.create({
          data: {
            managerMemberId: uiLeaderId,
            memberId: uiMemberId,
            body,
            discussedAt: new Date("2026-11-01T00:00:00.000Z"),
          },
        });
      }
    }
    if (platformLeaderId && platformMemberId) {
      const message = "データベース改善の共有がチームの助けになりました";
      if (!await tx.cheer.findFirst({
        where: { fromMemberId: platformLeaderId, toMemberId: platformMemberId, message },
      })) {
        await tx.cheer.create({
          data: { fromMemberId: platformLeaderId, toMemberId: platformMemberId, message, targetSkillId: platformSkillId },
        });
      }
    }
    if (salesLeaderId && salesMemberId &&
        !await tx.oneOnOneNote.findFirst({ where: { managerMemberId: salesLeaderId, memberId: salesMemberId } })) {
      await tx.oneOnOneNote.create({
        data: {
          managerMemberId: salesLeaderId,
          memberId: salesMemberId,
          body: "復帰時に確認する営業ナレッジを整理する。",
        },
      });
    }

    const frontendRoleId = roleIds.get("フロントエンドエンジニア");
    if (uiLeaderId && frontendRoleId &&
        !await tx.roleAchievement.findFirst({ where: { memberId: uiLeaderId, roleId: frontendRoleId } })) {
      await tx.roleAchievement.create({
        data: {
          memberId: uiLeaderId,
          roleId: frontendRoleId,
          achievedAt: new Date("2026-10-01T00:00:00.000Z"),
          achievedAsTarget: true,
          requirements: [{ skillCode: "DEMO-SKILL-002", requiredLevel: 4, achievedLevel: 5 }],
        },
      });
    }

    if (uiMemberId) {
      const project = await tx.memberProjectHistory.findFirst({
        where: { memberId: uiMemberId, title: "顧客ポータル刷新" },
        select: { id: true },
      });
      await tx.proposalSheetDraft.upsert({
        where: { memberId: uiMemberId },
        update: {},
        create: {
          memberId: uiMemberId,
          displayName: "フロントエンドエンジニア",
          customerRequest: "React を使った画面開発経験",
          projectHistoryIds: project ? [project.id] : [],
          excludedSkillIds: [],
          selfPr: "利用者視点で画面の改善を進めます。",
          strengths: "TypeScript と React の実装力",
          projectDescriptions: {},
          source: ProposalSheetDraftSource.MANUAL,
          updatedById: uiMemberId,
        },
      });
    }
  }, { timeout: 60_000 });
}

runWithTenant(seedTenantId, main)
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
