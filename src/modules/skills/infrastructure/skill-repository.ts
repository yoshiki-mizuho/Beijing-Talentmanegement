import type {
  CreateSkillInput,
  SkillCategoryInput,
  SkillInput,
  SkillLevelGuidesInput
} from "@/modules/skills/domain/skill-schema";
import { MemberStatus, type Prisma } from "@prisma/client";
import { generateNextSkillCodeFromExistingCodes } from "@/modules/skills/domain/skill-code";
import {
  SkillCategoryNotFoundError,
  SkillCodeGenerationError,
  SkillNameConflictError
} from "@/modules/skills/domain/skill-errors";
import type { SkillSearchInput } from "@/modules/skills/domain/skill-search";
import {
  getSkillDeletionState,
  type SkillUsage
} from "@/modules/skills/domain/skill-usage";
import { prisma } from "@/server/db/prisma";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import { diffForAudit } from "@/modules/audit/domain/audit-diff";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { UserFacingError } from "@/shared/lib/user-facing-error";

const SKILL_CODE_PREFIX = "SKILL-";

function skillAuditFields(skill: {
  code: string;
  name: string;
  categoryId: string;
  description: string | null;
  isActive: boolean;
}) {
  return {
    code: skill.code,
    name: skill.name,
    categoryId: skill.categoryId,
    description: skill.description,
    isActive: skill.isActive
  };
}

function categoryAuditFields(category: { name: string; displayOrder: number }) {
  return { name: category.name, displayOrder: category.displayOrder };
}

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

export async function listSkillLevelGuides(skillId: string) {
  const guides = await prisma.skillLevelGuide.findMany({
    where: { skillId },
    select: { level: true, description: true },
    orderBy: { level: "asc" }
  });
  const guidesByLevel = new Map(guides.map((guide) => [guide.level, guide.description]));

  return [1, 2, 3, 4, 5].map((level) => ({
    level,
    description: guidesByLevel.get(level) ?? null
  }));
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
      },
      levelGuides: {
        select: { level: true, description: true },
        orderBy: { level: "asc" }
      }
    },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
  });
}

export async function listPopularSkillsForMember(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { departmentId: true, department: { select: { name: true } } }
  });
  const departmentCounts = member?.departmentId
    ? await countPopularSkills({ departmentId: member.departmentId })
    : [];
  const useDepartment = departmentCounts.reduce(
    (total, item) => total + item.count,
    0
  ) >= 3;
  const counts = useDepartment
    ? departmentCounts
    : await countPopularSkills({});

  return {
    departmentName: useDepartment ? member?.department.name ?? null : null,
    skillIds: counts
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "ja"))
      .slice(0, 8)
      .map((item) => item.skillId)
  };
}

async function countPopularSkills({ departmentId }: { departmentId?: string }) {
  const skills = await prisma.skill.findMany({
    where: {
      isActive: true,
      memberSkills: {
        some: {
          member: {
            status: MemberStatus.ACTIVE,
            ...(departmentId ? { departmentId } : {})
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          memberSkills: {
            where: {
              member: {
                status: MemberStatus.ACTIVE,
                ...(departmentId ? { departmentId } : {})
              }
            }
          }
        }
      }
    }
  });

  return skills.map((skill) => ({
    skillId: skill.id,
    name: skill.name,
    count: skill._count.memberSkills
  }));
}

export async function createSkillCategory(
  input: SkillCategoryInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.skillCategory.create({ data: input });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.SKILL_CATEGORY_CREATE,
      targetType: AUDIT_TARGET_TYPE.SKILL_CATEGORY,
      targetId: item.id,
      after: categoryAuditFields(item)
    });
    return item;
  });
}

export async function updateSkillCategory(
  id: string,
  input: SkillCategoryInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.skillCategory.findUniqueOrThrow({ where: { id } });
    const item = await tx.skillCategory.update({ where: { id }, data: input });
    const diff = diffForAudit(categoryAuditFields(before), categoryAuditFields(item));
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.SKILL_CATEGORY_UPDATE,
        targetType: AUDIT_TARGET_TYPE.SKILL_CATEGORY,
        targetId: id,
        ...diff
      });
    }
    return item;
  });
}

export async function deleteSkillCategory(
  id: string,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const skillCount = await tx.skill.count({
      where: { categoryId: id }
    });

    if (skillCount > 0) {
      throw new UserFacingError("スキルが残っているカテゴリは削除できません。");
    }

    const item = await tx.skillCategory.delete({
      where: { id }
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.SKILL_CATEGORY_DELETE,
      targetType: AUDIT_TARGET_TYPE.SKILL_CATEGORY,
      targetId: id,
      before: categoryAuditFields(item)
    });
    return item;
  });
}

export async function listSkills(input?: SkillSearchInput) {
  const skills = await prisma.skill.findMany({
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
      levelGuides: {
        select: { level: true, description: true },
        orderBy: { level: "asc" }
      },
      // 平均レベルと保有者数は在籍中のメンバーだけで集計する
      memberSkills: {
        where: { member: { status: "ACTIVE" } },
        select: { level: true }
      },
      _count: {
        select: {
          memberSkills: true,
          selfAssessments: true,
          skillLevelChanges: true,
          cheers: true,
          roleRequirements: true
        }
      }
    },
    orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
  });

  return skills.map((skill) => ({
    ...skill,
    ...getSkillDeletionState({
      memberSkills: skill._count.memberSkills,
      selfAssessments: skill._count.selfAssessments,
      skillLevelChanges: skill._count.skillLevelChanges,
      cheers: skill._count.cheers,
      roleRequirements: skill._count.roleRequirements
    })
  }));
}

async function countSkillUsage(
  client: Prisma.TransactionClient,
  skillId: string
): Promise<SkillUsage> {
  const [memberSkills, selfAssessments, skillLevelChanges, cheers, roleRequirements] =
    await Promise.all([
      client.memberSkill.count({ where: { skillId } }),
      client.skillSelfAssessment.count({ where: { skillId } }),
      client.skillLevelChange.count({ where: { skillId } }),
      client.cheer.count({ where: { targetSkillId: skillId } }),
      client.roleRequirement.count({ where: { skillId } })
    ]);

  return { memberSkills, selfAssessments, skillLevelChanges, cheers, roleRequirements };
}

async function generateNextSkillCode(client: Prisma.TransactionClient) {
  const skills = await client.skill.findMany({
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

export async function createSkill(
  input: CreateSkillInput,
  actorMemberId: string | null
) {
  const maximumAttempts = 3;

  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const skill = await tx.skill.create({
          data: {
            ...input,
            code: await generateNextSkillCode(tx)
          }
        });
        await recordAuditLog(tx, {
          actorMemberId,
          action: AUDIT_ACTION.SKILL_CREATE,
          targetType: AUDIT_TARGET_TYPE.SKILL,
          targetId: skill.id,
          after: {
            code: skill.code,
            name: skill.name,
            categoryId: skill.categoryId,
            description: skill.description,
            isActive: skill.isActive
          }
        });
        return skill;
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

export async function updateSkill(
  id: string,
  input: SkillInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.skill.findUniqueOrThrow({ where: { id } });
    const item = await tx.skill.update({ where: { id }, data: input });
    const diff = diffForAudit(skillAuditFields(before), skillAuditFields(item));
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.SKILL_UPDATE,
        targetType: AUDIT_TARGET_TYPE.SKILL,
        targetId: id,
        ...diff
      });
    }
    return item;
  });
}

export async function updateSkillWithLevelGuides(
  id: string,
  input: SkillInput,
  levelGuides: SkillLevelGuidesInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (transaction) => {
    const before = await transaction.skill.findUniqueOrThrow({
      where: { id },
      include: { levelGuides: true }
    });
    const skill = await transaction.skill.update({ where: { id }, data: input });

    for (const guide of levelGuides.guides) {
      if (guide.description === "") {
        await transaction.skillLevelGuide.deleteMany({
          where: { skillId: id, level: guide.level }
        });
      } else {
        await transaction.skillLevelGuide.upsert({
          where: { skillId_level: { skillId: id, level: guide.level } },
          create: { skillId: id, ...guide },
          update: { description: guide.description }
        });
      }
    }

    const skillDiff = diffForAudit(skillAuditFields(before), skillAuditFields(skill));
    if (skillDiff) {
      await recordAuditLog(transaction, {
        actorMemberId,
        action: AUDIT_ACTION.SKILL_UPDATE,
        targetType: AUDIT_TARGET_TYPE.SKILL,
        targetId: id,
        ...skillDiff
      });
    }
    const afterGuides = await transaction.skillLevelGuide.findMany({ where: { skillId: id } });
    const guideDiff = diffForAudit(
      Object.fromEntries(before.levelGuides.map((guide) => [guide.level, guide.description])),
      Object.fromEntries(afterGuides.map((guide) => [guide.level, guide.description]))
    );
    if (guideDiff) {
      await recordAuditLog(transaction, {
        actorMemberId,
        action: AUDIT_ACTION.SKILL_LEVEL_GUIDES_UPDATE,
        targetType: AUDIT_TARGET_TYPE.SKILL,
        targetId: id,
        ...guideDiff
      });
    }
    return skill;
  });
}

export async function deactivateSkill(id: string, actorMemberId: string | null) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.skill.findUniqueOrThrow({ where: { id } });
    const item = await tx.skill.update({
      where: { id },
      data: { isActive: false }
    });
    const diff = diffForAudit(
      { isActive: before.isActive },
      { isActive: item.isActive }
    );
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.SKILL_DEACTIVATE,
        targetType: AUDIT_TARGET_TYPE.SKILL,
        targetId: id,
        ...diff
      });
    }
    return item;
  });
}

export async function deleteSkill(id: string, actorMemberId: string | null) {
  return prisma.$transaction(async (transaction) => {
    const deletionState = getSkillDeletionState(await countSkillUsage(transaction, id));

    if (!deletionState.isDeletable) {
      throw new UserFacingError(deletionState.reason ?? "使用中のスキルは削除できません。");
    }

    const item = await transaction.skill.delete({ where: { id } });
    await recordAuditLog(transaction, {
      actorMemberId,
      action: AUDIT_ACTION.SKILL_DELETE,
      targetType: AUDIT_TARGET_TYPE.SKILL,
      targetId: id,
      before: skillAuditFields(item)
    });
    return item;
  });
}
