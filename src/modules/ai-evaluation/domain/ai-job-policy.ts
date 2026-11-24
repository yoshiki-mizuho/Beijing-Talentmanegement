import { status } from "@grpc/grpc-js";

import { PlatformLlmError } from "@/server/platform/llm";

export const AI_JOB_DAILY_LIMIT = 50;
export const AI_JOB_RUN_LIMIT = 1;
export const AI_JOB_MAX_ATTEMPTS = 3;
export const AI_JOB_STALE_MINUTES = 15;

const MINUTE_MS = 60_000;
const JST_OFFSET_MS = 9 * 60 * MINUTE_MS;

function jstParts(date: Date) {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
  };
}

function fromJst(year: number, month: number, day: number, hour: number) {
  return new Date(Date.UTC(year, month, day, hour) - JST_OFFSET_MS);
}

export function startOfJstDay(date: Date) {
  const parts = jstParts(date);
  return fromJst(parts.year, parts.month, parts.day, 0);
}

export function nextJstDay(date: Date) {
  const start = startOfJstDay(date);
  return new Date(start.getTime() + 24 * 60 * MINUTE_MS);
}

export function isInBatchWindow(date: Date) {
  const parts = jstParts(date);
  const endHour = parts.dayOfWeek === 6 ? 12 : 4;
  return parts.hour >= 2 && parts.hour < endHour;
}

export function batchWindowEnd(date: Date) {
  const parts = jstParts(date);
  const endHour = parts.dayOfWeek === 6 ? 12 : 4;
  const end = fromJst(parts.year, parts.month, parts.day, endHour);
  return date < end && parts.hour >= 2
    ? end
    : new Date(date.getTime() + 10 * MINUTE_MS);
}

export type AiJobFailureDecision = {
  action: "retry" | "fail" | "skip_tenant";
  nextRunAt?: Date;
  errorCode: string;
};

export function decideAiJobFailure(
  error: unknown,
  attempts: number,
  now: Date,
): AiJobFailureDecision {
  if (!(error instanceof PlatformLlmError)) {
    // 応答が決めた形の JSON でない、など。Internal と同じく、やり直しは 1 回まで
    // （1 日の上限を使い切らないため）。
    return attempts > 1
      ? { action: "fail", errorCode: "INVALID_RESPONSE" }
      : { action: "retry", nextRunAt: now, errorCode: "INVALID_RESPONSE" };
  }
  const name = status[error.code] ?? String(error.code);
  const errorCode = error.reason
    ? `${name.toUpperCase()}:${error.reason}`
    : name.toUpperCase();
  if (error.code === status.PERMISSION_DENIED) {
    return { action: "skip_tenant", errorCode };
  }
  if (error.code === status.INVALID_ARGUMENT) {
    return { action: "fail", errorCode };
  }
  if (attempts >= AI_JOB_MAX_ATTEMPTS) {
    return { action: "fail", errorCode };
  }
  if (error.code === status.RESOURCE_EXHAUSTED) {
    if (error.reason?.includes("daily quota")) {
      return { action: "retry", nextRunAt: nextJstDay(now), errorCode };
    }
    if (error.reason === "batch window") {
      return { action: "retry", nextRunAt: batchWindowEnd(now), errorCode };
    }
    return {
      action: "retry",
      nextRunAt: new Date(now.getTime() + 10 * MINUTE_MS),
      errorCode,
    };
  }
  if (error.code === status.INTERNAL && attempts > 1) {
    return { action: "fail", errorCode };
  }
  return { action: "retry", nextRunAt: now, errorCode };
}
