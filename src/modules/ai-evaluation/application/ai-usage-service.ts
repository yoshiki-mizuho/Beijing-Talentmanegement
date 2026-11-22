import { AI_JOB_DAILY_LIMIT, startOfJstDay } from "@/modules/ai-evaluation/domain/ai-job-policy";
import * as repository from "@/modules/ai-evaluation/infrastructure/ai-job-repository";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAiUsageSummary(now = new Date()) {
  const today = startOfJstDay(now);
  const since = new Date(today.getTime() - 29 * DAY_MS);
  const rows = await repository.getAiJobUsageRows(since);
  const days = Array.from({ length: 30 }, (_, index) => ({
    date: new Date(since.getTime() + index * DAY_MS),
    SUCCEEDED: 0,
    FAILED: 0,
    QUEUED: 0,
    RUNNING: 0,
    GROWTH_HINT: 0,
    PROPOSAL_SHEET: 0,
    SKILL_PREREQUISITE: 0,
  }));
  for (const row of rows) {
    const index = Math.floor((startOfJstDay(row.createdAt).getTime() - since.getTime()) / DAY_MS);
    if (!days[index]) continue;
    days[index][row.status] += 1;
    days[index][row.kind] += 1;
  }
  const todayCount = rows.filter((row) => row.createdAt >= today).length;
  return {
    days,
    todayCount,
    dailyLimit: AI_JOB_DAILY_LIMIT,
    recentFailures: rows.filter((row) => row.status === "FAILED").slice(-20).reverse().map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      kind: row.kind,
      errorCode: row.errorCode ?? "UNKNOWN",
    })),
  };
}

export function getAiFeatureName(kind: string) {
  if (kind === "SKILL_PREREQUISITE") return "前提スキルの候補";
  if (kind === "PROPOSAL_SHEET") return "提案用スキルシート";
  return "育成のヒント";
}
