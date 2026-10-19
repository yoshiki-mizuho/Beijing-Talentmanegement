import { GrowthHintSource, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export type SaveGrowthHintInput = {
  memberId: string;
  source: GrowthHintSource;
  inputHash: string;
  content: Prisma.InputJsonValue;
  model?: string | null;
  generatedById?: string | null;
};

export async function findGrowthHint(memberId: string) {
  return prisma.growthHint.findUnique({ where: { memberId } });
}

export async function saveGrowthHint(input: SaveGrowthHintInput) {
  const { memberId, ...data } = input;

  return prisma.growthHint.upsert({
    where: { memberId },
    create: { memberId, ...data },
    update: { ...data, generatedAt: new Date() },
  });
}

export async function listGrowthHintDates(memberIds: string[]) {
  if (memberIds.length === 0) return [];
  return prisma.growthHint.findMany({
    where: { memberId: { in: memberIds } },
    select: { memberId: true, generatedAt: true },
  });
}
