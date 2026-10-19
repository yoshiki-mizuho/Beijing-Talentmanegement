import { AiUsageStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export type AiUsageEntry = {
  feature: string;
  actorMemberId?: string | null;
  targetMemberId?: string | null;
  model?: string | null;
  status: AiUsageStatus;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs: number;
  errorCode?: string | null;
};

export async function recordAiUsage(entry: AiUsageEntry) {
  return prisma.aiUsageLog.create({ data: entry });
}

export async function sumAiTokensSince(date: Date, feature?: string) {
  const result = await prisma.aiUsageLog.aggregate({
    where: {
      createdAt: { gte: date },
      ...(feature ? { feature } : {}),
    },
    _sum: { totalTokens: true },
  });

  return result._sum.totalTokens ?? 0;
}

export async function getAiUsageAggregates(start: Date, end: Date) {
  const where = { createdAt: { gte: start, lt: end } };
  const [statuses, totals] = await Promise.all([
    prisma.aiUsageLog.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.aiUsageLog.aggregate({
      where,
      _sum: { totalTokens: true },
      _avg: { latencyMs: true },
    }),
  ]);
  const successLatency = await prisma.aiUsageLog.aggregate({
    where: { ...where, status: "SUCCESS" },
    _avg: { latencyMs: true },
  });
  return {
    statuses,
    totalTokens: totals._sum.totalTokens ?? 0,
    averageSuccessLatencyMs: successLatency._avg.latencyMs ?? null,
  };
}

export async function getDailyAiUsage(start: Date, end: Date) {
  return prisma.$queryRaw<
    Array<{ day: Date; status: AiUsageStatus; count: bigint }>
  >`
    -- createdAt はタイムゾーンを持たない UTC の時刻なので、UTC と指定してから日本時間に変換する
    SELECT date_trunc('day', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tokyo') AS day,
           status,
           COUNT(*) AS count
    FROM "AiUsageLog"
    WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
    GROUP BY day, status
    ORDER BY day ASC
  `;
}

export async function getRecentAiUsage(start: Date, end: Date) {
  return prisma.aiUsageLog.findMany({
    where: { createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getAiUsageMemberNames(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.member.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
}
