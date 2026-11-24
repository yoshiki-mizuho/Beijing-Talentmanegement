import { AiJobKind, AiJobStatus, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export function findLatestGrowthHintJob(targetMemberId: string) {
  return prisma.aiJob.findFirst({
    where: { kind: "GROWTH_HINT", targetMemberId },
    orderBy: { createdAt: "desc" },
  });
}

export function findLatestProposalSheetJob(targetMemberId: string) {
  return prisma.aiJob.findFirst({
    where: { kind: "PROPOSAL_SHEET", targetMemberId },
    orderBy: { createdAt: "desc" },
  });
}

export function findLatestSkillPrerequisiteJob() {
  return prisma.aiJob.findFirst({
    where: { kind: "SKILL_PREREQUISITE" },
    orderBy: { createdAt: "desc" },
  });
}

export function reserveGrowthHintJob(input: {
  tenantId: string;
  targetMemberId: string;
  requestedByMemberId: string;
  dayStartedAt: Date;
  dailyLimit: number;
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.tenantId}))`;
    const active = await transaction.aiJob.findFirst({
      where: {
        kind: "GROWTH_HINT",
        targetMemberId: input.targetMemberId,
        status: { in: ["QUEUED", "RUNNING"] },
      },
      orderBy: { createdAt: "asc" },
    });
    if (active) return { kind: "active" as const, job: active };
    const count = await transaction.aiJob.count({
      where: { createdAt: { gte: input.dayStartedAt } },
    });
    if (count >= input.dailyLimit) return { kind: "daily_limit" as const };
    await transaction.hubTenant.upsert({
      where: { id: input.tenantId },
      create: { id: input.tenantId },
      update: { lastSeenAt: new Date() },
    });
    const job = await transaction.aiJob.create({
      data: {
        kind: "GROWTH_HINT",
        targetMemberId: input.targetMemberId,
        requestedByMemberId: input.requestedByMemberId,
        params: {},
      },
    });
    return { kind: "created" as const, job };
  });
}

export function reserveAiJob(input: {
  tenantId: string;
  kind: AiJobKind;
  targetMemberId?: string;
  requestedByMemberId: string;
  params: Prisma.InputJsonValue;
  dayStartedAt: Date;
  dailyLimit: number;
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.tenantId}))`;
    const active = await transaction.aiJob.findFirst({
      where: {
        kind: input.kind,
        ...(input.targetMemberId
          ? { targetMemberId: input.targetMemberId }
          : {}),
        status: { in: ["QUEUED", "RUNNING"] },
      },
      orderBy: { createdAt: "asc" },
    });
    if (active) return { kind: "active" as const, job: active };
    const count = await transaction.aiJob.count({
      where: { createdAt: { gte: input.dayStartedAt } },
    });
    if (count >= input.dailyLimit) return { kind: "daily_limit" as const };
    await transaction.hubTenant.upsert({
      where: { id: input.tenantId },
      create: { id: input.tenantId },
      update: { lastSeenAt: new Date() },
    });
    const job = await transaction.aiJob.create({
      data: {
        kind: input.kind,
        targetMemberId: input.targetMemberId,
        requestedByMemberId: input.requestedByMemberId,
        params: input.params,
      },
    });
    return { kind: "created" as const, job };
  });
}

export function getAiJobUsageRows(since: Date) {
  return prisma.aiJob.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });
}

export function listHubTenantIds() {
  return prisma.hubTenant.findMany({
    select: { id: true },
    orderBy: { firstSeenAt: "asc" },
  });
}

export function requeueStaleJobs(staleBefore: Date) {
  return prisma.aiJob.updateMany({
    where: { status: "RUNNING", startedAt: { lte: staleBefore } },
    data: { status: "QUEUED", startedAt: null, nextRunAt: new Date() },
  });
}

export function countRunningJobs() {
  return prisma.aiJob.count({ where: { status: "RUNNING" } });
}

export function listRunnableJobs(now: Date, take: number) {
  return prisma.aiJob.findMany({
    where: { status: "QUEUED", nextRunAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take,
  });
}

export async function claimJob(id: string, now: Date) {
  const claimed = await prisma.aiJob.updateMany({
    where: { id, status: "QUEUED" },
    data: {
      status: "RUNNING",
      attempts: { increment: 1 },
      startedAt: now,
      finishedAt: null,
      errorCode: null,
    },
  });
  if (claimed.count === 0) return null;
  return prisma.aiJob.findUnique({ where: { id } });
}

export function completeJob(input: {
  id: string;
  model: string;
  durationMs: number;
  result?: Prisma.InputJsonValue;
}) {
  return prisma.aiJob.update({
    where: { id: input.id },
    data: {
      status: "SUCCEEDED",
      result: input.result,
      model: input.model,
      durationMs: input.durationMs,
      finishedAt: new Date(),
    },
  });
}

export function retryJob(id: string, nextRunAt: Date, errorCode: string) {
  return prisma.aiJob.update({
    where: { id },
    data: {
      status: "QUEUED",
      nextRunAt,
      startedAt: null,
      errorCode,
    },
  });
}

export function failJob(id: string, errorCode: string, durationMs: number) {
  return prisma.aiJob.update({
    where: { id },
    data: {
      status: "FAILED",
      errorCode,
      durationMs,
      finishedAt: new Date(),
    },
  });
}

export function deferTenantJobs(nextRunAt: Date, errorCode: string) {
  return prisma.aiJob.updateMany({
    where: { status: "QUEUED", nextRunAt: { lte: nextRunAt } },
    data: { nextRunAt, errorCode },
  });
}

export type RunnableAiJob = {
  id: string;
  kind: AiJobKind;
  status: AiJobStatus;
  targetMemberId: string | null;
  requestedByMemberId: string;
  attempts: number;
};
