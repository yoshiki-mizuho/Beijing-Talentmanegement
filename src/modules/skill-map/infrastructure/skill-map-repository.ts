import { prisma } from "@/server/db/prisma";

export async function getSkillMapData() {
  const [members, skills] = await Promise.all([
    prisma.member.findMany({
      include: {
        department: true,
        memberSkills: {
          select: {
            skillId: true,
            level: true
          }
        }
      },
      orderBy: { employeeNo: "asc" }
    }),
    prisma.skill.findMany({
      where: { isActive: true },
      include: {
        category: true
      },
      orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
    })
  ]);

  return { members, skills };
}
