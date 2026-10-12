export function calculateAverageSkillLevel(
  memberSkills: readonly { level: number }[]
) {
  if (memberSkills.length === 0) return 0;
  const total = memberSkills.reduce((sum, memberSkill) => sum + memberSkill.level, 0);
  return Math.round((total / memberSkills.length) * 10) / 10;
}
