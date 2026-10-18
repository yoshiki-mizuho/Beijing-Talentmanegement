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
