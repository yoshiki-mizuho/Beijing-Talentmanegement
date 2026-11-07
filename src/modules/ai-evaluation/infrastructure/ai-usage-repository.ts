import { AiUsageStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import {
  AI_USER_RATE_LIMIT_WINDOW_MS,
  getAiUsageMonth,
  hasReachedAiUserRateLimit,
} from "@/modules/ai-evaluation/domain/ai-usage-summary";

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

export type AiUsageReservation =
  | { kind: "reserved"; id: string }
  | { kind: "monthly_limit" }
  | { kind: "rate_limited_user" };

export async function reserveAiUsage(input: {
  feature: string;
  actorMemberId: string;
  targetMemberId?: string | null;
  reservedTokens: number;
  monthlyTokenLimit: number | null;
  now?: Date;
}): Promise<AiUsageReservation> {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7246102026)`;
    const month = getAiUsageMonth(undefined, now);
    const [tokens, recentCalls] = await Promise.all([
      tx.aiUsageLog.aggregate({
        where: { createdAt: { gte: month.start, lt: month.end } },
        _sum: { totalTokens: true },
      }),
      tx.aiUsageLog.count({
        where: {
          actorMemberId: input.actorMemberId,
          createdAt: {
            gte: new Date(now.getTime() - AI_USER_RATE_LIMIT_WINDOW_MS),
            lte: now,
          },
          OR: [
            { errorCode: null },
            {
              errorCode: {
                notIn: [
                  "not_configured",
                  "monthly_limit",
                  "rate_limited_user",
                ],
              },
            },
          ],
        },
      }),
    ]);
    if (hasReachedAiUserRateLimit(recentCalls)) {
      return { kind: "rate_limited_user" };
    }
    const totalTokens = tokens._sum.totalTokens ?? 0;
    if (
      input.monthlyTokenLimit !== null &&
      totalTokens + input.reservedTokens > input.monthlyTokenLimit
    ) {
      return { kind: "monthly_limit" };
    }
    const reservation = await tx.aiUsageLog.create({
      data: {
        feature: input.feature,
        actorMemberId: input.actorMemberId,
        targetMemberId: input.targetMemberId,
        status: "FAILED",
        errorCode: "in_progress",
        totalTokens: input.reservedTokens,
        latencyMs: 0,
      },
      select: { id: true },
    });
    return { kind: "reserved", id: reservation.id };
  });
}

export async function completeAiUsageReservation(
  id: string,
  result: Omit<AiUsageEntry, "feature" | "actorMemberId" | "targetMemberId">,
) {
  return prisma.aiUsageLog.update({
    where: { id },
    data: {
      model: result.model,
      status: result.status,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      ...(result.totalTokens == null ? {} : { totalTokens: result.totalTokens }),
      latencyMs: result.latencyMs,
      errorCode: result.errorCode,
    },
  });
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
