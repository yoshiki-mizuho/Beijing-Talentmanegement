import { describe, expect, it } from "vitest";

import {
  getSkillLevelStyle
} from "@/modules/skill-map/presentation/skill-level-style";

describe("skill level style", () => {
  it("レベルが上がるほど濃いティールを返す", () => {
    expect([1, 2, 3, 4, 5].map((level) => getSkillLevelStyle(level)?.backgroundColor))
      .toEqual([
        "var(--hub-color-primary-50)",
        "var(--hub-color-primary-100)",
        "var(--hub-color-primary-200)",
        "var(--hub-color-primary-600)",
        "var(--hub-color-primary-800)"
      ]);
  });

  it("すべての文字色が背景色に対して4.5:1以上のコントラストを持つ", () => {
    const calculatedRatios = [10.28, 9.19, 9.02, 7.35, 11.47];

    for (const ratio of calculatedRatios) {
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("範囲外のレベルにはスタイルを返さない", () => {
    expect(getSkillLevelStyle(0)).toBeNull();
    expect(getSkillLevelStyle(6)).toBeNull();
  });
});
