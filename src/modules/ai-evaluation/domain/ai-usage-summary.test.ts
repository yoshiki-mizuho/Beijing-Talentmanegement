import { describe, expect, it } from "vitest";

import {
  calculatePercentage,
  getAiMonthlyTokenLimit,
  getAiUsageMonth,
  hasReachedMonthlyTokenLimit,
  translateAiErrorCode,
} from "./ai-usage-summary";

describe("AI利用状況の集計", () => {
  it("日本時間の月初から翌月初までを返す", () => {
    const month = getAiUsageMonth("2026-10");
    expect(month.start.toISOString()).toBe("2026-09-30T15:00:00.000Z");
    expect(month.end.toISOString()).toBe("2026-10-31T15:00:00.000Z");
  });

  it("未来の月は日本時間の今月に戻す", () => {
    const month = getAiUsageMonth("2026-11", new Date("2026-10-31T16:00:00Z"));
    expect(month.key).toBe("2026-11");
    expect(
      getAiUsageMonth("2026-12", new Date("2026-10-31T16:00:00Z")).key,
    ).toBe("2026-11");
  });

  it("理由と割合を表示用に変換する", () => {
    expect(translateAiErrorCode("monthly_limit")).toBe("月の上限");
    expect(translateAiErrorCode("timeout")).toBe("時間切れ");
    expect(calculatePercentage(2, 40)).toBe(5);
    expect(calculatePercentage(1, 0)).toBe(0);
  });

  it("正の整数だけを上限として扱う", () => {
    expect(getAiMonthlyTokenLimit("50000")).toBe(50000);
    expect(getAiMonthlyTokenLimit("")).toBeNull();
    expect(getAiMonthlyTokenLimit("0")).toBeNull();
    expect(getAiMonthlyTokenLimit("1.5")).toBeNull();
    expect(hasReachedMonthlyTokenLimit(10, null)).toBe(false);
    expect(hasReachedMonthlyTokenLimit(9, 10)).toBe(false);
    expect(hasReachedMonthlyTokenLimit(10, 10)).toBe(true);
  });
});
