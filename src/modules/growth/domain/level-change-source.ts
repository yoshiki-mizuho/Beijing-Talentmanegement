import { SkillLevelChangeSource } from "@prisma/client";

export const nonGrowthLevelChangeSources = [
  SkillLevelChangeSource.BACKFILL,
  SkillLevelChangeSource.CSV_IMPORT,
] as const;

export function isGrowthLevelChange(source: string) {
  return !nonGrowthLevelChangeSources.includes(
    source as (typeof nonGrowthLevelChangeSources)[number],
  );
}
