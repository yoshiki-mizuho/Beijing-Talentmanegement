import { z } from "zod";

export const skillPrerequisitePairSchema = z.object({
  skillId: z.string().min(1),
  prerequisiteSkillId: z.string().min(1)
});

export const skillPrerequisiteBatchSchema = z.object({
  pairs: z.array(skillPrerequisitePairSchema).min(1).max(30)
});

export type SkillPrerequisitePair = z.infer<typeof skillPrerequisitePairSchema>;

export function validateSkillPrerequisitePair(
  pair: SkillPrerequisitePair,
  activeSkillIds: ReadonlySet<string>,
  existingPairs: readonly SkillPrerequisitePair[]
) {
  if (pair.skillId === pair.prerequisiteSkillId) {
    return { valid: false as const, reason: "同じスキルを前提にはできません。" };
  }
  if (!activeSkillIds.has(pair.skillId) || !activeSkillIds.has(pair.prerequisiteSkillId)) {
    return { valid: false as const, reason: "無効なスキルは登録できません。" };
  }
  const duplicate = existingPairs.some(
    (item) =>
      item.skillId === pair.skillId &&
      item.prerequisiteSkillId === pair.prerequisiteSkillId
  );
  if (duplicate) return { valid: true as const, skip: true as const };
  const reverse = existingPairs.some(
    (item) =>
      item.skillId === pair.prerequisiteSkillId &&
      item.prerequisiteSkillId === pair.skillId
  );
  if (reverse) {
    return {
      valid: false as const,
      reason: "逆向きの前提関係がすでに登録されています。"
    };
  }
  return { valid: true as const, skip: false as const };
}
