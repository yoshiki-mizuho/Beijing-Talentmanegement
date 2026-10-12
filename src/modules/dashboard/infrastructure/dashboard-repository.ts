import { prisma } from "@/server/db/prisma";

export async function getOrganizationDashboardData(
  memberIds: string[],
  from: Date,
) {
  const [members, levelChanges, pendingAssessments] = await Promise.all([
    prisma.member.findMany({
      where: { id: { in: memberIds }, status: "ACTIVE" },
      select: {
        id: true,
        department: { select: { id: true, name: true } },
        memberSkills: { select: { skillId: true, level: true } },
        targetRole: {
          select: {
            id: true,
            name: true,
            roleRequirements: {
              select: {
                skillId: true,
                requiredLevel: true,
                isRequired: true,
                skill: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.skillLevelChange.findMany({
      where: { memberId: { in: memberIds }, changedAt: { gte: from } },
      select: {
        memberId: true,
        changedAt: true,
        source: true,
        fromLevel: true,
        toLevel: true,
      },
    }),
    prisma.skillSelfAssessment.findMany({
      where: { memberId: { in: memberIds }, status: "PENDING" },
      select: { memberId: true, createdAt: true },
    }),
  ]);
  return { members, levelChanges, pendingAssessments };
}
