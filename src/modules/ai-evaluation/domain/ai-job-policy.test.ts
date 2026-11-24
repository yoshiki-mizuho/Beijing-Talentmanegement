import { status } from "@grpc/grpc-js";
import { describe, expect, it } from "vitest";

import { PlatformLlmError } from "@/server/platform/llm";

import {
  batchWindowEnd,
  decideAiJobFailure,
  isInBatchWindow,
  nextJstDay,
} from "./ai-job-policy";

describe("AI job retry policy", () => {
  it.each([
    ["平日01:59", "2026-11-22T16:59:00.000Z", false],
    ["平日02:00", "2026-11-22T17:00:00.000Z", true],
    ["平日03:59", "2026-11-22T18:59:00.000Z", true],
    ["平日04:00", "2026-11-22T19:00:00.000Z", false],
    ["土曜11:59", "2026-11-21T02:59:00.000Z", true],
    ["土曜12:00", "2026-11-21T03:00:00.000Z", false],
    ["日曜02:00", "2026-11-21T17:00:00.000Z", true],
  ])("%sのbatch windowを日本時間で判定する", (_label, date, expected) => {
    expect(isInBatchWindow(new Date(date))).toBe(expected);
  });

  it("busyは10分後にする", () => {
    const now = new Date("2026-11-22T01:00:00.000Z");
    const decision = decideAiJobFailure(
      new PlatformLlmError(status.RESOURCE_EXHAUSTED, "busy"),
      1,
      now,
    );
    expect(decision.nextRunAt).toEqual(new Date("2026-11-22T01:10:00.000Z"));
  });

  it("平日のbatch windowは日本時間4時まで待つ", () => {
    expect(batchWindowEnd(new Date("2026-11-23T18:00:00.000Z")))
      .toEqual(new Date("2026-11-23T19:00:00.000Z"));
  });

  it("土曜のbatch windowは日本時間12時まで待つ", () => {
    expect(batchWindowEnd(new Date("2026-11-20T18:00:00.000Z")))
      .toEqual(new Date("2026-11-21T03:00:00.000Z"));
  });

  it("daily quotaは次の日本時間0時まで待つ", () => {
    expect(nextJstDay(new Date("2026-11-22T14:59:59.000Z")))
      .toEqual(new Date("2026-11-22T15:00:00.000Z"));
  });

  it("Internalは同じ入力の再試行を1回までにする", () => {
    const decision = decideAiJobFailure(
      new PlatformLlmError(status.INTERNAL, null),
      2,
      new Date(),
    );
    expect(decision.action).toBe("fail");
  });

  it("読めない応答は1回だけやり直し、2回目で失敗にする", () => {
    const now = new Date();
    expect(decideAiJobFailure(new Error("invalid json"), 1, now))
      .toEqual({ action: "retry", nextRunAt: now, errorCode: "INVALID_RESPONSE" });
    expect(decideAiJobFailure(new Error("invalid json"), 2, now))
      .toEqual({ action: "fail", errorCode: "INVALID_RESPONSE" });
  });
});
