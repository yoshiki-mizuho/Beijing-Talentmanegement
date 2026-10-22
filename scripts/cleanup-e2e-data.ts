import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

import { isE2eMember, isLocalDatabaseUrl } from "../prisma/cleanup-e2e-policy";

type Counts = Record<string, number>;

function printCounts(heading: string, counts: Counts) {
  console.log(heading);
  for (const [label, count] of Object.entries(counts)) {
    console.log(`  ${label}: ${count}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isLocalDatabaseUrl(databaseUrl)) {
    console.error("E2Eデータの掃除はローカルDBでのみ実行できます。");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const [members, skills, categories, roles, departments] = await Promise.all(
      [
        prisma.member.findMany({
          select: { id: true, employeeNo: true, name: true, email: true },
        }),
        prisma.skill.findMany({
          where: {
            OR: [
              { name: { startsWith: "E2E" } },
              { name: { startsWith: "DBG-" } },
            ],
          },
          select: { id: true },
        }),
        prisma.skillCategory.findMany({
          where: { name: { startsWith: "E2E" } },
          select: { id: true },
        }),
        prisma.role.findMany({
          where: { name: { startsWith: "E2E" } },
          select: { id: true },
        }),
        prisma.department.findMany({
          where: { name: { startsWith: "E2E" } },
          select: { id: true },
        }),
      ],
    );

    const memberIds = members.filter(isE2eMember).map((member) => member.id);
    const skillIds = skills.map((skill) => skill.id);
    const categoryIds = categories.map((category) => category.id);
    const roleIds = roles.map((role) => role.id);
    const departmentIds = departments.map((department) => department.id);

    const assessments = await prisma.skillSelfAssessment.findMany({
      where: {
        OR: [
          { memberId: { in: memberIds } },
          { reviewedByMemberId: { in: memberIds } },
          { skillId: { in: skillIds } },
        ],
      },
      select: { id: true },
    });
    const assessmentIds = assessments.map((item) => item.id);
    const [levelChanges, cheers, csvImportJobs] = await Promise.all([
      prisma.skillLevelChange.findMany({
        where: {
          OR: [
            { memberId: { in: memberIds } },
            { changedByMemberId: { in: memberIds } },
            { skillId: { in: skillIds } },
            { skillSelfAssessmentId: { in: assessmentIds } },
          ],
        },
        select: { id: true },
      }),
      prisma.cheer.findMany({
        where: {
          OR: [
            { fromMemberId: { in: memberIds } },
            { toMemberId: { in: memberIds } },
            { mentorMemberId: { in: memberIds } },
            { targetSkillId: { in: skillIds } },
          ],
        },
        select: { id: true },
      }),
      prisma.csvImportJob.findMany({
        where: { createdById: { in: memberIds } },
        select: { id: true },
      }),
    ]);
    const levelChangeIds = levelChanges.map((item) => item.id);
    const cheerIds = cheers.map((item) => item.id);
    const csvImportJobIds = csvImportJobs.map((item) => item.id);
    const targetIds = [
      ...memberIds,
      ...skillIds,
      ...categoryIds,
      ...roleIds,
      ...departmentIds,
      ...assessmentIds,
      ...levelChangeIds,
      ...cheerIds,
      ...csvImportJobIds,
    ];

    const [
      notificationCount,
      reactionCount,
      commentCount,
      memberSkillCount,
      noteCount,
      growthHintCount,
      aiUsageCount,
      requirementCount,
      userCount,
      auditLogCount,
    ] = await Promise.all([
      prisma.notification.count({
        where: {
          OR: [
            { recipientMemberId: { in: memberIds } },
            { skillSelfAssessmentId: { in: assessmentIds } },
            { skillLevelChangeId: { in: levelChangeIds } },
            { cheerId: { in: cheerIds } },
          ],
        },
      }),
      prisma.levelUpReaction.count({
        where: {
          OR: [
            { levelChangeId: { in: levelChangeIds } },
            { memberId: { in: memberIds } },
          ],
        },
      }),
      prisma.levelUpComment.count({
        where: {
          OR: [
            { levelChangeId: { in: levelChangeIds } },
            { authorMemberId: { in: memberIds } },
          ],
        },
      }),
      prisma.memberSkill.count({
        where: {
          OR: [
            { memberId: { in: memberIds } },
            { approvedByMemberId: { in: memberIds } },
            { skillId: { in: skillIds } },
          ],
        },
      }),
      prisma.oneOnOneNote.count({
        where: {
          OR: [
            { managerMemberId: { in: memberIds } },
            { memberId: { in: memberIds } },
          ],
        },
      }),
      prisma.growthHint.count({
        where: {
          OR: [
            { memberId: { in: memberIds } },
            { generatedById: { in: memberIds } },
          ],
        },
      }),
      prisma.aiUsageLog.count({
        where: {
          OR: [
            { actorMemberId: { in: memberIds } },
            { targetMemberId: { in: memberIds } },
          ],
        },
      }),
      prisma.roleRequirement.count({
        where: {
          OR: [{ roleId: { in: roleIds } }, { skillId: { in: skillIds } }],
        },
      }),
      prisma.user.count({ where: { memberId: { in: memberIds } } }),
      prisma.auditLog.count({
        where: {
          OR: [
            { actorMemberId: { in: memberIds } },
            { targetId: { in: targetIds } },
            { csvImportJobId: { in: csvImportJobIds } },
          ],
        },
      }),
    ]);

    const preview = {
      notifications: notificationCount,
      levelUpReactions: reactionCount,
      levelUpComments: commentCount,
      memberSkills: memberSkillCount,
      members: memberIds.length,
      skills: skillIds.length,
      skillCategories: categoryIds.length,
      roles: roleIds.length,
      departments: departmentIds.length,
      assessments: assessmentIds.length,
      levelChanges: levelChangeIds.length,
      cheers: cheerIds.length,
      oneOnOneNotes: noteCount,
      growthHints: growthHintCount,
      aiUsageLogs: aiUsageCount,
      roleRequirements: requirementCount,
      users: userCount,
      auditLogs: auditLogCount,
      csvImportJobs: csvImportJobIds.length,
    };
    printCounts("削除候補", preview);

    if (!process.argv.includes("--yes")) {
      console.log(
        "確認のみです。削除する場合は --yes を付けて再実行してください。",
      );
      return;
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const counts: Counts = {};
      const record = async (
        label: string,
        operation: Promise<Prisma.BatchPayload>,
      ) => {
        counts[label] = (await operation).count;
      };

      await record(
        "notifications",
        tx.notification.deleteMany({
          where: {
            OR: [
              { recipientMemberId: { in: memberIds } },
              { skillSelfAssessmentId: { in: assessmentIds } },
              { skillLevelChangeId: { in: levelChangeIds } },
              { cheerId: { in: cheerIds } },
            ],
          },
        }),
      );
      await record(
        "levelUpReactions",
        tx.levelUpReaction.deleteMany({
          where: {
            OR: [
              { levelChangeId: { in: levelChangeIds } },
              { memberId: { in: memberIds } },
            ],
          },
        }),
      );
      await record(
        "levelUpComments",
        tx.levelUpComment.deleteMany({
          where: {
            OR: [
              { levelChangeId: { in: levelChangeIds } },
              { authorMemberId: { in: memberIds } },
            ],
          },
        }),
      );
      await record(
        "memberSkills",
        tx.memberSkill.deleteMany({
          where: {
            OR: [
              { memberId: { in: memberIds } },
              { approvedByMemberId: { in: memberIds } },
              { skillId: { in: skillIds } },
            ],
          },
        }),
      );
      await record(
        "skillLevelChanges",
        tx.skillLevelChange.deleteMany({
          where: { id: { in: levelChangeIds } },
        }),
      );
      await record(
        "skillAssessments",
        tx.skillSelfAssessment.deleteMany({
          where: { id: { in: assessmentIds } },
        }),
      );
      await record(
        "cheers",
        tx.cheer.deleteMany({ where: { id: { in: cheerIds } } }),
      );
      await record(
        "oneOnOneNotes",
        tx.oneOnOneNote.deleteMany({
          where: {
            OR: [
              { managerMemberId: { in: memberIds } },
              { memberId: { in: memberIds } },
            ],
          },
        }),
      );
      await record(
        "growthHints",
        tx.growthHint.deleteMany({
          where: {
            OR: [
              { memberId: { in: memberIds } },
              { generatedById: { in: memberIds } },
            ],
          },
        }),
      );
      await record(
        "aiUsageLogs",
        tx.aiUsageLog.deleteMany({
          where: {
            OR: [
              { actorMemberId: { in: memberIds } },
              { targetMemberId: { in: memberIds } },
            ],
          },
        }),
      );
      await record(
        "roleRequirements",
        tx.roleRequirement.deleteMany({
          where: {
            OR: [{ roleId: { in: roleIds } }, { skillId: { in: skillIds } }],
          },
        }),
      );
      await record(
        "users",
        tx.user.deleteMany({ where: { memberId: { in: memberIds } } }),
      );
      await record(
        "auditLogs",
        tx.auditLog.deleteMany({
          where: {
            OR: [
              { actorMemberId: { in: memberIds } },
              { targetId: { in: targetIds } },
              { csvImportJobId: { in: csvImportJobIds } },
            ],
          },
        }),
      );
      await record(
        "csvImportJobs",
        tx.csvImportJob.deleteMany({ where: { id: { in: csvImportJobIds } } }),
      );
      await tx.member.updateMany({
        where: { managerId: { in: memberIds } },
        data: { managerId: null },
      });
      await tx.member.updateMany({
        where: { targetRoleId: { in: roleIds } },
        data: { targetRoleId: null },
      });
      await tx.department.updateMany({
        where: { parentDepartmentId: { in: departmentIds } },
        data: { parentDepartmentId: null },
      });
      await record(
        "members",
        tx.member.deleteMany({ where: { id: { in: memberIds } } }),
      );
      await record(
        "skills",
        tx.skill.deleteMany({ where: { id: { in: skillIds } } }),
      );
      await record(
        "roles",
        tx.role.deleteMany({ where: { id: { in: roleIds } } }),
      );
      await record(
        "skillCategories",
        tx.skillCategory.deleteMany({ where: { id: { in: categoryIds } } }),
      );
      await record(
        "departments",
        tx.department.deleteMany({ where: { id: { in: departmentIds } } }),
      );
      return counts;
    });

    printCounts("削除結果", deleted);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // 接続文字列を出さないよう、メッセージだけを表示する
  const message = error instanceof Error ? error.message : String(error);
  console.error(`E2Eデータの掃除に失敗しました：${message}`);
  process.exitCode = 1;
});
