import type { SkillCategoryInput, SkillInput } from "@/modules/skills/domain/skill-schema";
import { prisma } from "@/server/db/prisma";

export async function listSkillCategories() {
  return prisma.skillCategory.findMany({
    include: {
      _count: {
        select: { skills: true }
      }
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
  });
}

export async function createSkillCategory(input: SkillCategoryInput) {
  return prisma.skillCategory.create({ data: input });
}

export async function listSkills() {
  return prisma.skill.findMany({
    include: {
      category: true,
      memberSkills: true,
      roleRequirements: true
    },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
  });
}

export async function createSkill(input: SkillInput) {
  return prisma.skill.create({ data: input });
}

export async function updateSkill(id: string, input: SkillInput) {
  return prisma.skill.update({
    where: { id },
    data: input
  });
}

export async function deactivateSkill(id: string) {
  return prisma.skill.update({
    where: { id },
    data: { isActive: false }
  });
}
