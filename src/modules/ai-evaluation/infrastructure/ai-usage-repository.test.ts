import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  aggregate: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    aiUsageLog: { update: mocks.update },
  },
}));

import {
  completeAiUsageReservation,
  reserveAiUsage,
} from "./ai-usage-repository";

describe("AI利用量の予約", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((callback) =>
      callback({
        $executeRaw: mocks.executeRaw,
        aiUsageLog: {
          aggregate: mocks.aggregate,
          count: mocks.count,
          create: mocks.create,
        },
      }),
    );
    mocks.executeRaw.mockResolvedValue(1);
    mocks.aggregate.mockResolvedValue({ _sum: { totalTokens: 6_000 } });
    mocks.count.mockResolvedValue(9);
    mocks.create.mockResolvedValue({ id: "reservation" });
  });

  it("合計と予約量が上限ちょうどなら予約する", async () => {
    const result = await reserveAiUsage(input(4_000, 10_000));
    expect(result).toEqual({ kind: "reserved", id: "reservation" });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorCode: "in_progress",
          totalTokens: 4_000,
        }),
      }),
    );
  });

  it("予約量を加えると上限を超える場合は予約しない", async () => {
    const result = await reserveAiUsage(input(4_001, 10_000));
    expect(result).toEqual({ kind: "monthly_limit" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("直近10件なら回数制限し、上限未設定でも同じ判定をする", async () => {
    mocks.count.mockResolvedValue(10);
    const result = await reserveAiUsage(input(4_000, null));
    expect(result).toEqual({ kind: "rate_limited_user" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("usageがない実績更新では予約量を上書きしない", async () => {
    await completeAiUsageReservation("reservation", {
      model: "fake",
      status: "SUCCESS",
      latencyMs: 12,
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "reservation" },
      data: expect.not.objectContaining({ totalTokens: expect.anything() }),
    });
  });
});

function input(reservedTokens: number, monthlyTokenLimit: number | null) {
  return {
    feature: "growth_hint",
    actorMemberId: "member-1",
    reservedTokens,
    monthlyTokenLimit,
    now: new Date("2026-11-07T00:00:00Z"),
  };
}
