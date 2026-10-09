export function shouldRecordSkillLevelChange(
  fromLevel: number | null,
  toLevel: number
) {
  return fromLevel !== toLevel;
}
