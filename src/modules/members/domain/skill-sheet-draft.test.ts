import { describe, expect, it } from "vitest";

import { parseSkillSheetDraft } from "./skill-sheet-draft";

const rows = [
  { skillId: "available", currentLevel: 2, pendingLevel: null },
  { skillId: "pending", currentLevel: 1, pendingLevel: 2 },
  { skillId: "unowned", currentLevel: null, pendingLevel: null }
];

function draft(
  selectedLevels: Record<string, unknown>,
  comments: Record<string, unknown> = {}
) {
  return JSON.stringify({ version: 1, selectedLevels, comments });
}

describe("parseSkillSheetDraft", () => {
  it.each([
    ["壊れたJSON", "{"],
    ["違うversion", JSON.stringify({ version: 2, selectedLevels: {}, comments: {} })],
    ["配列のselectedLevels", JSON.stringify({ version: 1, selectedLevels: [], comments: {} })],
    ["commentsなし", JSON.stringify({ version: 1, selectedLevels: {} })]
  ])("%sは復元しない", (_label, value) => {
    expect(parseSkillSheetDraft(value, rows)).toBeNull();
  });

  it("今の行にないスキルと承認待ちの行を捨てる", () => {
    expect(parseSkillSheetDraft(draft({ available: 3, missing: 2, pending: 3 }), rows)).toEqual({
      version: 1,
      selectedLevels: { available: 3 },
      comments: {}
    });
  });

  it("1から5の整数でないレベルと今のレベルと同じ値を捨てる", () => {
    expect(parseSkillSheetDraft(draft({ available: 2, zero: 0, decimal: 2.5, high: 6 }), [
      ...rows,
      { skillId: "zero", currentLevel: null, pendingLevel: null },
      { skillId: "decimal", currentLevel: null, pendingLevel: null },
      { skillId: "high", currentLevel: null, pendingLevel: null }
    ])).toEqual({
      version: 1,
      selectedLevels: {},
      comments: {}
    });
  });

  it("復元するレベルのひとことだけを残し、200字を超える値を捨てる", () => {
    expect(parseSkillSheetDraft(draft(
      { available: 3, unowned: 1 },
      { available: "残す", unowned: "a".repeat(201), missing: "捨てる" }
    ), rows)).toEqual({
      version: 1,
      selectedLevels: { available: 3, unowned: 1 },
      comments: { available: "残す" }
    });
  });
});
