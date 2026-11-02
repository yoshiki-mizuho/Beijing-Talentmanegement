import type {
  CreateSkillInput,
  ReorderSkillsInput,
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
      displayOrder: true,
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
    orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }, { name: "asc" }]
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
    const lastCategory = await tx.skillCategory.findFirst({
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true }
    });
    const item = await tx.skillCategory.create({
      data: { ...input, displayOrder: (lastCategory?.displayOrder ?? -1) + 1 }
    });
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
    orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }, { name: "asc" }]
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

async function nextSkillDisplayOrder(
  client: Prisma.TransactionClient,
  categoryId: string
) {
  const lastSkill = await client.skill.findFirst({
    where: { categoryId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true }
  });
  return (lastSkill?.displayOrder ?? -1) + 1;
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
  return createSkillWithLevelGuides(
    input,
    { guides: [1, 2, 3, 4, 5].map((level) => ({ level, description: "" })) },
    actorMemberId
  );
}

export async function createSkillWithLevelGuides(
  input: CreateSkillInput,
  levelGuides: SkillLevelGuidesInput,
  actorMemberId: string | null
) {
  const maximumAttempts = 3;

  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const skill = await tx.skill.create({
          data: {
            ...input,
            displayOrder: await nextSkillDisplayOrder(tx, input.categoryId),
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
        const guides = levelGuides.guides.filter(
          (guide) => guide.description !== ""
        );
        if (guides.length > 0) {
          await tx.skillLevelGuide.createMany({
            data: guides.map((guide) => ({ skillId: skill.id, ...guide }))
          });
          await recordAuditLog(tx, {
            actorMemberId,
            action: AUDIT_ACTION.SKILL_LEVEL_GUIDES_UPDATE,
            targetType: AUDIT_TARGET_TYPE.SKILL,
            targetId: skill.id,
            after: Object.fromEntries(
              guides.map((guide) => [guide.level, guide.description])
            )
          });
        }
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
    const item = await tx.skill.update({
      where: { id },
      data: {
        ...input,
        ...(before.categoryId === input.categoryId
          ? {}
          : { displayOrder: await nextSkillDisplayOrder(tx, input.categoryId) })
      }
    });
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
    const skill = await transaction.skill.update({
      where: { id },
      data: {
        ...input,
        ...(before.categoryId === input.categoryId
          ? {}
          : { displayOrder: await nextSkillDisplayOrder(transaction, input.categoryId) })
      }
    });

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

export async function reorderSkills(
  input: ReorderSkillsInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const [categories, skills] = await Promise.all([
      tx.skillCategory.findMany({
        select: { id: true, displayOrder: true }
      }),
      tx.skill.findMany({
        select: { id: true, categoryId: true, displayOrder: true, code: true, name: true, description: true, isActive: true }
      })
    ]);
    const submittedCategoryIds = input.categories.map((category) => category.categoryId);
    const submittedSkillIds = input.categories.flatMap((category) => category.skillIds);
    const categoryIds = new Set(categories.map((category) => category.id));
    const skillIds = new Set(skills.map((skill) => skill.id));
    if (
      submittedCategoryIds.length !== categoryIds.size ||
      submittedSkillIds.length !== skillIds.size ||
      new Set(submittedCategoryIds).size !== submittedCategoryIds.length ||
      new Set(submittedSkillIds).size !== submittedSkillIds.length ||
      submittedCategoryIds.some((id) => !categoryIds.has(id)) ||
      submittedSkillIds.some((id) => !skillIds.has(id))
    ) {
      throw new UserFacingError("一覧が更新されています。画面を開き直してください。");
    }

    const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
    let changedCategoryCount = 0;
    let changedSkillCount = 0;
    let movedSkillCount = 0;

    for (const [categoryOrder, category] of input.categories.entries()) {
      const currentCategory = categories.find((item) => item.id === category.categoryId);
      if (currentCategory?.displayOrder !== categoryOrder) {
        changedCategoryCount += 1;
        await tx.skillCategory.update({
          where: { id: category.categoryId },
          data: { displayOrder: categoryOrder }
        });
      }
      for (const [skillOrder, skillId] of category.skillIds.entries()) {
        const currentSkill = skillsById.get(skillId);
        if (!currentSkill) continue;
        const categoryChanged = currentSkill.categoryId !== category.categoryId;
        if (categoryChanged || currentSkill.displayOrder !== skillOrder) {
          changedSkillCount += 1;
          if (categoryChanged) movedSkillCount += 1;
          await tx.skill.update({
            where: { id: skillId },
            data: { categoryId: category.categoryId, displayOrder: skillOrder }
          });
          if (categoryChanged) {
            await recordAuditLog(tx, {
              actorMemberId,
              action: AUDIT_ACTION.SKILL_UPDATE,
              targetType: AUDIT_TARGET_TYPE.SKILL,
              targetId: skillId,
              before: { categoryId: currentSkill.categoryId },
              after: { categoryId: category.categoryId },
              changedFields: ["categoryId"]
            });
          }
        }
      }
    }

    if (changedCategoryCount > 0 || changedSkillCount > 0) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.SKILL_REORDER,
        targetType: AUDIT_TARGET_TYPE.SKILL,
        targetId: null,
        metadata: { changedCategoryCount, changedSkillCount, movedSkillCount }
      });
    }
    return { changedCategoryCount, changedSkillCount, movedSkillCount };
  });
}
