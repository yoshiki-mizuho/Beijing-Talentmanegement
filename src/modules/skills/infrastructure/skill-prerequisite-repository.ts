import type { SkillPrerequisiteSource } from "@prisma/client";

import {
  AUDIT_ACTION,
  AUDIT_TARGET_TYPE,
} from "@/modules/audit/domain/audit-action";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import type { SkillPrerequisitePair } from "@/modules/skills/domain/skill-prerequisite";
import { validateSkillPrerequisitePair } from "@/modules/skills/domain/skill-prerequisite";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export function listSkillPrerequisites() {
  return prisma.skillPrerequisite.findMany({
    include: {
      skill: { select: { id: true, name: true } },
      prerequisiteSkill: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function listSkillPrerequisitesBySkillIds(skillIds: string[]) {
  if (skillIds.length === 0) return Promise.resolve([]);
  return prisma.skillPrerequisite.findMany({
    where: { skillId: { in: skillIds } },
    include: { prerequisiteSkill: true },
  });
}

export async function getSkillPrerequisiteSuggestionContext() {
  const [skills, prerequisites] = await Promise.all([
    prisma.skill.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: { select: { name: true } },
      },
      orderBy: [
        { category: { displayOrder: "asc" } },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.skillPrerequisite.findMany({
      select: { skillId: true, prerequisiteSkillId: true },
    }),
  ]);
  return { skills, prerequisites };
}

export async function createSkillPrerequisites(
  pairs: SkillPrerequisitePair[],
  source: SkillPrerequisiteSource,
  actorMemberId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const [skills, existing] = await Promise.all([
      tx.skill.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      tx.skillPrerequisite.findMany({
        select: { skillId: true, prerequisiteSkillId: true },
      }),
    ]);
    const activeIds = new Set(skills.map((skill) => skill.id));
    const accepted: SkillPrerequisitePair[] = [];
    for (const pair of pairs) {
      const result = validateSkillPrerequisitePair(pair, activeIds, [
        ...existing,
        ...accepted,
      ]);
      if (!result.valid) throw new UserFacingError(result.reason);
      if (!result.skip) accepted.push(pair);
    }
    if (accepted.length > 0) {
      await tx.skillPrerequisite.createMany({
        data: accepted.map((pair) => ({
          ...pair,
          source,
          createdById: actorMemberId,
        })),
      });
      const names = new Map(skills.map((skill) => [skill.id, skill.name]));
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.SKILL_PREREQUISITE_CREATE,
        targetType: AUDIT_TARGET_TYPE.SKILL_PREREQUISITE,
        targetId: null,
        metadata: {
          count: accepted.length,
          pairs: accepted.map((pair) => ({
            ...pair,
            skillName: names.get(pair.skillId),
            prerequisiteSkillName: names.get(pair.prerequisiteSkillId),
          })),
        },
      });
    }
    return {
      createdCount: accepted.length,
      skippedCount: pairs.length - accepted.length,
    };
  });
}

export async function deleteSkillPrerequisite(
  id: string,
  actorMemberId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.skillPrerequisite.delete({
      where: { id },
      include: { skill: true, prerequisiteSkill: true },
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.SKILL_PREREQUISITE_DELETE,
      targetType: AUDIT_TARGET_TYPE.SKILL_PREREQUISITE,
      targetId: item.id,
      before: {
        skillId: item.skillId,
        skillName: item.skill.name,
        prerequisiteSkillId: item.prerequisiteSkillId,
        prerequisiteSkillName: item.prerequisiteSkill.name,
        source: item.source,
      },
    });
    return item;
  });
}
