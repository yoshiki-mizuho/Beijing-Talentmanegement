export const MIN_SKILL_LEVEL = 1;
export const MAX_SKILL_LEVEL = 5;

export function isValidSkillLevel(level: number) {
  return Number.isInteger(level) && level >= MIN_SKILL_LEVEL && level <= MAX_SKILL_LEVEL;
}

export function assertSkillLevel(level: number) {
  if (!isValidSkillLevel(level)) {
    throw new Error(`Skill level must be an integer from ${MIN_SKILL_LEVEL} to ${MAX_SKILL_LEVEL}.`);
  }
}
