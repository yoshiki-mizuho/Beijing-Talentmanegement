import { prisma } from "@/server/db/prisma";

export async function getOrganizationDashboardScope(memberId: string) {
  const [viewer, departments, memberCounts] = await Promise.all([
    prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: { id: true, departmentId: true },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, parentDepartmentId: true },
    }),
    prisma.member.groupBy({
      by: ["departmentId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);
  return { viewer, departments, memberCounts };
}

export async function getOrganizationDashboardSource(input: {
  departmentIds?: string[];
  changesSince: Date;
}) {
  const members = await prisma.member.findMany({
    where: {
      status: "ACTIVE",
      ...(input.departmentIds
        ? { departmentId: { in: input.departmentIds } }
        : {}),
    },
    select: {
      id: true,
      departmentId: true,
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
