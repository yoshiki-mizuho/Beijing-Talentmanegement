const ROLE_CODE_PATTERN = /^ROLE-(\d{4,})$/;

export function generateNextRoleCodeFromExistingCodes(codes: string[]) {
  const maximum = codes.reduce((currentMaximum, code) => {
    const match = ROLE_CODE_PATTERN.exec(code);
    if (!match) return currentMaximum;
    return Math.max(currentMaximum, Number(match[1]));
  }, 0);

  return `ROLE-${String(maximum + 1).padStart(4, "0")}`;
}
