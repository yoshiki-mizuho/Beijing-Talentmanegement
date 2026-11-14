import { describe, expect, it } from "vitest";
import { isAdmin, skillSheetFileName } from "./skill-sheet-template";

describe("skill sheet template domain", () => {
  it("ADMINだけを許可する", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("MANAGER")).toBe(false);
    expect(isAdmin("MEMBER")).toBe(false);
  });

  it("日本時間の日付でファイル名を作る", () => {
    expect(skillSheetFileName("提案名", new Date("2026-11-15T15:30:00Z"))).toBe(
      "スキルシート_提案名_20261116.xlsx"
    );
    expect(skillSheetFileName("", new Date("2026-11-15T15:30:00Z"))).toContain("_member_");
  });
});
