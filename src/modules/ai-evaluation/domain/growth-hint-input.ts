import { createHash } from "node:crypto";

export type GrowthHintInput = {
  approvedSkills: Array<{
    skillId: string;
    name: string;
    category: string;
    level: number;
  }>;
  targetRole: {
    name: string;
    requirements: Array<{
      skillId: string;
      name: string;
      requiredLevel: number;
    }>;
  } | null;
  skillGaps: Array<{
    skillId: string;
    name: string;
    currentLevel: number;
    requiredLevel: number;
  }>;
  recentGrowth: Array<{
    skillId: string;
    name: string;
    fromLevel: number | null;
    toLevel: number;
  }>;
};

function sortedInput(input: GrowthHintInput): GrowthHintInput {
  const bySkillId = <T extends { skillId: string }>(items: T[]) =>
    [...items].sort((left, right) => left.skillId.localeCompare(right.skillId));
  return {
    approvedSkills: bySkillId(input.approvedSkills),
    targetRole: input.targetRole
      ? {
          ...input.targetRole,
          requirements: bySkillId(input.targetRole.requirements),
        }
      : null,
    skillGaps: bySkillId(input.skillGaps),
    recentGrowth: [...input.recentGrowth].sort(
      (left, right) =>
        left.skillId.localeCompare(right.skillId) ||
        left.toLevel - right.toLevel,
    ),
  };
}

export function serializeGrowthHintInput(input: GrowthHintInput) {
  return JSON.stringify(sortedInput(input));
}

export function hashGrowthHintInput(input: GrowthHintInput) {
  return createHash("sha256")
    .update(serializeGrowthHintInput(input))
    .digest("hex");
}
