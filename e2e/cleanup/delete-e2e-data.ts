import type { Prisma, PrismaClient } from "@prisma/client";

export type E2eDataIds = {
  memberIds: string[];
  skillIds: string[];
  categoryIds: string[];
  roleIds: string[];
  departmentIds: string[];
};

export async function deleteE2eData(
  prisma: PrismaClient,
  ids: E2eDataIds,
) {
  const { memberIds, skillIds, categoryIds, roleIds, departmentIds } = ids;
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
  const notifications = await prisma.notification.findMany({
    where: { OR: [
      { recipientMemberId: { in: memberIds } },
      { skillSelfAssessmentId: { in: assessmentIds } },
      { skillLevelChangeId: { in: levelChangeIds } },
      { cheerId: { in: cheerIds } },
    ] },
    select: { id: true },
  });
  const notificationIds = notifications.map((item) => item.id);
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
    ...notificationIds,
  ];

  return prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};
    const record = async (
      label: string,
      operation: Promise<Prisma.BatchPayload>,
    ) => {
      counts[label] = (await operation).count;
    };

    await record("notifications", tx.notification.deleteMany({ where: { OR: [
      { recipientMemberId: { in: memberIds } },
      { skillSelfAssessmentId: { in: assessmentIds } },
      { skillLevelChangeId: { in: levelChangeIds } },
      { cheerId: { in: cheerIds } },
    ] } }));
    await record("levelUpReactions", tx.levelUpReaction.deleteMany({ where: { OR: [
      { levelChangeId: { in: levelChangeIds } }, { memberId: { in: memberIds } },
    ] } }));
    await record("levelUpComments", tx.levelUpComment.deleteMany({ where: { OR: [
      { levelChangeId: { in: levelChangeIds } }, { authorMemberId: { in: memberIds } },
    ] } }));
    await record("memberSkills", tx.memberSkill.deleteMany({ where: { OR: [
      { memberId: { in: memberIds } }, { approvedByMemberId: { in: memberIds } },
      { skillId: { in: skillIds } },
    ] } }));
    await record("skillLevelChanges", tx.skillLevelChange.deleteMany({ where: { id: { in: levelChangeIds } } }));
    await record("skillAssessments", tx.skillSelfAssessment.deleteMany({ where: { id: { in: assessmentIds } } }));
    await record("cheers", tx.cheer.deleteMany({ where: { id: { in: cheerIds } } }));
    await record("oneOnOneNotes", tx.oneOnOneNote.deleteMany({ where: { OR: [
      { managerMemberId: { in: memberIds } }, { memberId: { in: memberIds } },
    ] } }));
    await record("growthHints", tx.growthHint.deleteMany({ where: { OR: [
      { memberId: { in: memberIds } }, { generatedById: { in: memberIds } },
    ] } }));
    await record("aiUsageLogs", tx.aiUsageLog.deleteMany({ where: { OR: [
      { actorMemberId: { in: memberIds } }, { targetMemberId: { in: memberIds } },
    ] } }));
    await record("skillPrerequisites", tx.skillPrerequisite.deleteMany({ where: { OR: [
      { skillId: { in: skillIds } }, { prerequisiteSkillId: { in: skillIds } },
      { createdById: { in: memberIds } },
    ] } }));
    await record("roleAchievements", tx.roleAchievement.deleteMany({ where: { OR: [
      { memberId: { in: memberIds } }, { roleId: { in: roleIds } },
    ] } }));
    await record("roleRequirements", tx.roleRequirement.deleteMany({ where: { OR: [
      { roleId: { in: roleIds } }, { skillId: { in: skillIds } },
    ] } }));
    await record("users", tx.user.deleteMany({ where: { memberId: { in: memberIds } } }));
    await record("auditLogs", tx.auditLog.deleteMany({ where: { OR: [
      { actorMemberId: { in: memberIds } }, { targetId: { in: targetIds } },
      { csvImportJobId: { in: csvImportJobIds } },
    ] } }));
    await record("csvImportJobs", tx.csvImportJob.deleteMany({ where: { id: { in: csvImportJobIds } } }));
    await tx.member.updateMany({ where: { managerId: { in: memberIds } }, data: { managerId: null } });
    await tx.member.updateMany({ where: { targetRoleId: { in: roleIds } }, data: { targetRoleId: null } });
    await tx.department.updateMany({ where: { parentDepartmentId: { in: departmentIds } }, data: { parentDepartmentId: null } });
    await record("members", tx.member.deleteMany({ where: { id: { in: memberIds } } }));
    await record("skills", tx.skill.deleteMany({ where: { id: { in: skillIds } } }));
    await record("roles", tx.role.deleteMany({ where: { id: { in: roleIds } } }));
    await record("skillCategories", tx.skillCategory.deleteMany({ where: { id: { in: categoryIds } } }));
    await record("departments", tx.department.deleteMany({ where: { id: { in: departmentIds } } }));
    return counts;
  });
}
