export type SkillMapSource = {
  id: string;
  name: string;
  category: { id: string; name: string };
  holders: {
    id: string;
    name: string;
    jobTitle: string | null;
    avatarUpdatedAt: Date | string | null;
    level: number;
  }[];
  changes: {
    memberId: string;
    changedAt: Date;
    source: string;
    fromLevel: number | null;
    toLevel: number;
  }[];
};

export function buildSkillMap(input: { skills: SkillMapSource[]; now: Date }) {
  const boundary = new Date(input.now.getTime() - 90 * 86400000);
  const ranked = input.skills
    .filter((skill) => skill.holders.length >= 2)
    .map((skill) => ({
      id: skill.id,
      average: average(skill.holders.map((item) => item.level)),
    }))
    .sort((a, b) => b.average - a.average);
  const rankById = new Map(ranked.map((item, index) => [item.id, index + 1]));
  const totalRanked = ranked.length;
  return input.skills
    .map((skill) => {
      const averageLevel = average(skill.holders.map((item) => item.level));
      const rank = rankById.get(skill.id) ?? null;
      const strength =
        rank === null || totalRanked === 0
          ? 1
          : Math.max(
              1,
              5 -
                Math.floor(
                  (rank - 1) / Math.max(1, Math.ceil(totalRanked / 5)),
                ),
            );
      const growthCount = skill.changes.filter(
        (item) =>
          item.changedAt >= boundary &&
          item.source !== "BACKFILL" &&
          item.toLevel > (item.fromLevel ?? 0),
      ).length;
      return {
        ...skill,
        holderCount: skill.holders.length,
        averageLevel,
        rank,
        totalRanked,
        strength,
        growthCount,
        levelCounts: [5, 4, 3, 2, 1].map((level) => ({
          level,
          count: skill.holders.filter((item) => item.level === level).length,
        })),
      };
    })
    .sort(
      (a, b) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) -
          (b.rank ?? Number.MAX_SAFE_INTEGER) || b.holderCount - a.holderCount,
    );
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}
