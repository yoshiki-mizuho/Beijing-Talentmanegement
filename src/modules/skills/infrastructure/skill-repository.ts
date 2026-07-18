import type {
  CreateSkillInput,
  SkillCategoryInput,
  SkillInput
} from "@/modules/skills/domain/skill-schema";
import { generateNextSkillCodeFromExistingCodes } from "@/modules/skills/domain/skill-code";
import type { SkillSearchInput } from "@/modules/skills/domain/skill-search";
import { prisma } from "@/server/db/prisma";

const SKILL_CODE_PREFIX = "SKILL-";

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

export async function updateSkillCategory(id: string, input: SkillCategoryInput) {
  return prisma.skillCategory.update({
    where: { id },
    data: input
  });
}

export async function deleteSkillCategory(id: string) {
  const skillCount = await prisma.skill.count({
    where: { categoryId: id }
  });

  if (skillCount > 0) {
    throw new Error("Cannot delete a category that still has skills.");
  }

  return prisma.skillCategory.delete({
    where: { id }
  });
}

export async function listSkills(input?: SkillSearchInput) {
  return prisma.skill.findMany({
    where: {
      ...(input?.q
        ? {
            OR: [
              { code: { contains: input.q, mode: "insensitive" } },
              { name: { contains: input.q, mode: "insensitive" } },
              { description: { contains: input.q, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(input?.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input?.isActive === undefined ? {} : { isActive: input.isActive })
    },
    include: {
      category: true,
      _count: {
        select: {
          memberSkills: true,
          roleRequirements: true
        }
      }
    },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
  });
}

async function generateNextSkillCode() {
  const skills = await prisma.skill.findMany({
    where: {
      code: {
        startsWith: SKILL_CODE_PREFIX
      }
    },
    select: { code: true }
  });
  return generateNextSkillCodeFromExistingCodes(
    skills.map((skill) => skill.code)
  );
}

export async function createSkill(input: CreateSkillInput) {
  return prisma.skill.create({
    data: {
      ...input,
      code: await generateNextSkillCode()
    }
  });
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
