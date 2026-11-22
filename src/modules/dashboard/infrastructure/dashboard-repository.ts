import { prisma } from "@/server/db/prisma";

export async function getOrganizationDashboardSource(input: {
  memberIds: string[];
  changesSince: Date;
}) {
  const members = await prisma.member.findMany({
    where: { id: { in: input.memberIds }, status: "ACTIVE" },
    select: {
      id: true,
      platformUserId: true,
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
              anyOfGroup: true,
              skill: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  const changes = await prisma.skillLevelChange.findMany({
    where: {
      memberId: { in: members.map((member) => member.id) },
      changedAt: { gte: input.changesSince },
    },
    select: {
      memberId: true,
      skillId: true,
      changedAt: true,
      source: true,
      fromLevel: true,
      toLevel: true,
      skill: { select: { category: { select: { name: true } } } },
    },
  });
  return {
    members,
    changes: changes.map(({ skill, ...change }) => ({
      ...change,
      categoryName: skill.category.name,
    })),
  };
}
