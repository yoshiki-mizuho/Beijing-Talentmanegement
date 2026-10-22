import type { LevelUpCelebration } from "@/modules/growth/application/growth-service";

export function getCelebrationHeading(celebrations: LevelUpCelebration[]) {
  const hasExistingSkillLevelUp = celebrations.some(
    (celebration) => celebration.fromLevel !== null
  );
  return hasExistingSkillLevelUp
    ? `${celebrations.length} つのスキルがレベルアップしました`
    : `${celebrations.length} つのスキルが登録されました`;
}
