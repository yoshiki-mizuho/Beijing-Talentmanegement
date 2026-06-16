const SKILL_CODE_PREFIX = "SKILL-";
const SKILL_CODE_PATTERN = /^SKILL-(\d{4})$/;

export function generateNextSkillCodeFromExistingCodes(codes: string[]) {
  const maxNumber = codes.reduce((max, code) => {
    const matched = SKILL_CODE_PATTERN.exec(code);
    const value = matched ? Number(matched[1]) : 0;
    return Math.max(max, value);
  }, 0);

  return `${SKILL_CODE_PREFIX}${String(maxNumber + 1).padStart(4, "0")}`;
}
