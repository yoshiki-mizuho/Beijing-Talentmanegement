import {
  calculatePercentage,
  getAiMonthlyTokenLimit,
  getAiUsageMonth,
  translateAiErrorCode,
} from "@/modules/ai-evaluation/domain/ai-usage-summary";
import * as repository from "@/modules/ai-evaluation/infrastructure/ai-usage-repository";

export async function getAiUsageSummary(monthValue?: string, now = new Date()) {
  const month = getAiUsageMonth(monthValue, now);
  const [aggregates, dailyRows, recentRows] = await Promise.all([
    repository.getAiUsageAggregates(month.start, month.end),
    repository.getDailyAiUsage(month.start, month.end),
    repository.getRecentAiUsage(month.start, month.end),
  ]);
  const counts = { SUCCESS: 0, FALLBACK: 0, FAILED: 0 };
  for (const row of aggregates.statuses) counts[row.status] = row._count._all;
  const total = counts.SUCCESS + counts.FALLBACK + counts.FAILED;
  const memberIds = [
    ...new Set(
      recentRows
        .flatMap((row) => [row.actorMemberId, row.targetMemberId])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const names = new Map(
    (await repository.getAiUsageMemberNames(memberIds)).map((member) => [
      member.id,
      member.name,
    ]),
  );
  const days = Array.from(
    { length: new Date(month.end.getTime() - 1).getUTCDate() },
    (_, index) => ({ day: index + 1, SUCCESS: 0, FALLBACK: 0, FAILED: 0 }),
  );
  for (const row of dailyRows) {
    const day = row.day.getUTCDate();
    days[day - 1][row.status] = Number(row.count);
  }
  return {
    month,
    counts,
    total,
    failurePercentage: calculatePercentage(counts.FAILED, total),
    totalTokens: aggregates.totalTokens,
    tokenLimit: getAiMonthlyTokenLimit(),
    averageSuccessLatencyMs: aggregates.averageSuccessLatencyMs,
    days,
    recent: recentRows.map((row) => ({
      ...row,
      actorName: row.actorMemberId
        ? (names.get(row.actorMemberId) ?? "不明")
        : "システム",
      targetName: row.targetMemberId
        ? (names.get(row.targetMemberId) ?? "不明")
        : "—",
      reason: translateAiErrorCode(row.errorCode),
    })),
  };
}
