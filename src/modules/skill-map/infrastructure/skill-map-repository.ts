import { prisma } from "@/server/db/prisma";

export async function getSkillMapData(memberIds: string[], since: Date) {
  const skills = await prisma.skill.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: { select: { id: true, name: true, displayOrder: true } },
      memberSkills: {
        where: { memberId: { in: memberIds }, member: { status: "ACTIVE" } },
        select: {
          level: true,
          member: { select: { id: true, name: true, jobTitle: true } },
        },
      },
      skillLevelChanges: {
        where: { memberId: { in: memberIds }, changedAt: { gte: since } },
        select: {
          memberId: true,
          changedAt: true,
          source: true,
          fromLevel: true,
          toLevel: true,
        },
      },
    },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }],
  });
  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    holders: skill.memberSkills.map((item) => ({
      ...item.member,
      level: item.level,
    })),
    changes: skill.skillLevelChanges,
  }));
}
