export type SkillMapPresentationInput = {
  skills: { id: string }[];
  rows: {
    levels: { level: number | null }[];
  }[];
  skillSummaries: {
    holderCount: number;
    averageLevel: number | null;
  }[];
};

export function buildSkillMapPresentation(input: SkillMapPresentationInput) {
  const assignedCount = input.rows.reduce(
    (total, row) =>
      total + row.levels.filter((item) => item.level !== null).length,
    0
  );
  const availableCellCount = input.rows.length * input.skills.length;
  const measuredLevels = input.rows.flatMap((row) =>
    row.levels
      .map((item) => item.level)
      .filter((level): level is number => level !== null)
  );

  return {
    memberCount: input.rows.length,
    skillCount: input.skills.length,
    assignedCount,
    coverageRate:
      availableCellCount === 0
        ? 0
        : Math.round((assignedCount / availableCellCount) * 100),
    averageLevel:
      measuredLevels.length === 0
        ? null
        : measuredLevels.reduce((sum, level) => sum + level, 0) /
          measuredLevels.length
  };
}
