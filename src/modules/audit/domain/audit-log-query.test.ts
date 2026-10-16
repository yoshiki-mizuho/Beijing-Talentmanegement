import { describe, expect, it } from "vitest";
import { classifyAuditAction, parseAuditLogQuery } from "./audit-log-query";

describe("parseAuditLogQuery", () => {
  const now = new Date("2026-10-16T03:00:00Z");
  it("初期値は日本時間の直近30日", () => {
    const result = parseAuditLogQuery({}, now);
    expect(result.period).toBe("30");
    expect(result.from.toISOString()).toBe("2026-09-16T15:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-10-16T14:59:59.999Z");
  });
  it("期間指定を解釈する", () => {
    const result = parseAuditLogQuery(
      { period: "custom", from: "2026-10-01", to: "2026-10-03" },
      now,
    );
    expect(result.from.toISOString()).toBe("2026-09-30T15:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-10-03T14:59:59.999Z");
  });
  it("不正な期間指定を拒否する", () =>
    expect(() =>
      parseAuditLogQuery(
        { period: "custom", from: "bad", to: "2026-10-03" },
        now,
      ),
    ).toThrow());
});

describe("classifyAuditAction", () => {
  it.each([
    ["member.create", "create"],
    ["role.requirement.set", "update"],
    ["role.requirement.remove", "delete"],
    ["skill.level_guides.update", "update"],
    ["skill_assessment.correct", "correct"],
  ])("%s を %s に分類する", (action, expected) =>
    expect(classifyAuditAction(action)).toBe(expected),
  );
});
