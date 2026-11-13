import { describe, expect, it } from "vitest";

import {
  formatTeamGoalPeriod,
  formatTeamGoalRange,
  formatTeamGoalText,
  getPreviousTeamGoalPeriod,
  getRemainingDays,
  getTeamGoalPeriod,
  getTokyoMonth,
  isDateInTeamGoalPeriod,
  teamGoalInputSchema,
  teamGoalUnit
} from "./team-goal";

describe("team goal domain", () => {
  it("calculates a Tokyo month period and its previous period", () => {
    const period = getTeamGoalPeriod("2026-11", 3);
    expect(period.start.toISOString()).toBe("2026-10-31T15:00:00.000Z");
    expect(period.end.toISOString()).toBe("2027-01-31T15:00:00.000Z");
    expect(isDateInTeamGoalPeriod(period.start, "2026-11", 3)).toBe(true);
    expect(isDateInTeamGoalPeriod(period.end, "2026-11", 3)).toBe(false);
    expect(getPreviousTeamGoalPeriod("2026-11", 3).end).toEqual(period.start);
  });

  it("formats the period, remaining days and goal text", () => {
    expect(formatTeamGoalPeriod("2026-11", 3)).toBe("11月〜1月のチーム目標");
    expect(getRemainingDays(new Date("2026-11-01T15:00:00Z"), new Date("2026-11-03T15:00:00Z"))).toBe(2);
    expect(formatTeamGoalText({ kind: "LEVEL_UP_COUNT", targetCount: 18, targetLevel: null, skillName: null })).toBe("レベルアップ 18件");
  });

  it("uses the Tokyo calendar for the current month", () => {
    expect(getTokyoMonth(new Date("2026-10-31T14:59:59Z"))).toBe("2026-10");
    expect(getTokyoMonth(new Date("2026-10-31T15:00:00Z"))).toBe("2026-11");
  });

  it("wraps the period over the year end", () => {
    expect(formatTeamGoalRange("2026-11", 1)).toBe("11月");
    expect(formatTeamGoalRange("2026-11", 6)).toBe("11月〜4月");
    expect(formatTeamGoalRange("2026-11", 12)).toBe("11月〜10月");
    expect(formatTeamGoalPeriod("2026-11", 1)).toBe("11月のチーム目標");
    const previous = getPreviousTeamGoalPeriod("2026-01", 3);
    expect(previous.start.toISOString()).toBe("2025-09-30T15:00:00.000Z");
  });

  it("formats each kind of goal", () => {
    expect(
      formatTeamGoalText({ kind: "LEVEL_UP_MEMBERS", targetCount: 4, targetLevel: null, skillName: null })
    ).toBe("レベルアップした人 4人");
    expect(
      formatTeamGoalText({ kind: "SKILL_REACH", targetCount: 4, targetLevel: 3, skillName: "TypeScript" })
    ).toBe("TypeScript Lv3 以上 4人");
    expect(teamGoalUnit("LEVEL_UP_COUNT")).toBe("件");
    expect(teamGoalUnit("SKILL_REACH")).toBe("人");
  });

  it("rejects values out of range", () => {
    const base = { kind: "LEVEL_UP_COUNT", targetCount: 2, months: 1 };
    expect(teamGoalInputSchema.safeParse(base).success).toBe(true);
    expect(teamGoalInputSchema.safeParse({ ...base, months: 2 }).success).toBe(false);
    expect(teamGoalInputSchema.safeParse({ ...base, targetCount: 0 }).success).toBe(false);
    expect(teamGoalInputSchema.safeParse({ ...base, targetCount: 1000 }).success).toBe(false);
    expect(teamGoalInputSchema.safeParse({ ...base, note: "あ".repeat(61) }).success).toBe(false);
  });

  it("requires a skill and level for skill reach", () => {
    expect(teamGoalInputSchema.safeParse({ kind: "SKILL_REACH", targetCount: 2, months: 1 }).success).toBe(false);
  });
});
