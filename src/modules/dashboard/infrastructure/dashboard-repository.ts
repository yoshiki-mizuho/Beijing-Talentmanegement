import { prisma } from "@/server/db/prisma";

export async function getOrganizationDashboardSource(memberId: string) {
  const [viewer, departments, members] = await Promise.all([
    prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: { id: true, departmentId: true },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, parentDepartmentId: true },
    }),
    prisma.member.findMany({
      where: { status: "ACTIVE" },
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
    }),
  ]);
  const changes = await prisma.skillLevelChange.findMany({
    where: { memberId: { in: members.map((member) => member.id) } },
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
    viewer,
    departments,
    members,
    changes: changes.map(({ skill, ...change }) => ({
      ...change,
      categoryName: skill.category.name,
    })),
  };
}
