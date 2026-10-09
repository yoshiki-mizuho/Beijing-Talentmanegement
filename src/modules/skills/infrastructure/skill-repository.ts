import type {
  CreateSkillInput,
  SkillCategoryInput,
  SkillInput
} from "@/modules/skills/domain/skill-schema";
import { generateNextSkillCodeFromExistingCodes } from "@/modules/skills/domain/skill-code";
import {
  SkillCategoryNotFoundError,
  SkillCodeGenerationError,
  SkillNameConflictError
} from "@/modules/skills/domain/skill-errors";
import type { SkillSearchInput } from "@/modules/skills/domain/skill-search";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";

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

export async function listSkillLevels() {
  return prisma.skillLevel.findMany({
    orderBy: { level: "asc" }
  });
}

export async function listActiveSkillsForSkillSheet() {
  return prisma.skill.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: {
        select: {
          id: true,
          name: true,
          displayOrder: true
        }
      }
    },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
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
    throw new UserFacingError("スキルが残っているカテゴリは削除できません。");
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

function hasConstraintTarget(error: unknown, targetName: string) {
  if (!error || typeof error !== "object" || !("meta" in error)) {
    return false;
  }

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");
  return targetText.toLowerCase().includes(targetName.toLowerCase());
}

function hasPrismaCode(error: unknown, code: string) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === code
  );
}

export async function createSkill(input: CreateSkillInput) {
  const maximumAttempts = 3;

  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    try {
      return await prisma.skill.create({
        data: {
          ...input,
          code: await generateNextSkillCode()
        }
      });
    } catch (error) {
      if (hasPrismaCode(error, "P2002") && hasConstraintTarget(error, "code")) {
        continue;
      }

      if (hasPrismaCode(error, "P2002")) {
        throw new SkillNameConflictError();
      }

      if (hasPrismaCode(error, "P2003")) {
        throw new SkillCategoryNotFoundError();
      }

      throw error;
    }
  }

  throw new SkillCodeGenerationError();
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
