import { describe, expect, it } from "vitest";

import {
  getContrastRatio,
  getSkillLevelStyle
} from "@/modules/skill-map/presentation/skill-level-style";

describe("skill level style", () => {
  it("レベルが上がるほど濃いティールを返す", () => {
    expect([1, 2, 3, 4, 5].map((level) => getSkillLevelStyle(level)?.backgroundColor))
      .toEqual(["#F0FDFA", "#CCFBF1", "#99F6E4", "#0F766E", "#134E4A"]);
  });

  it("すべての文字色が背景色に対して4.5:1以上のコントラストを持つ", () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const style = getSkillLevelStyle(level);

      expect(style).not.toBeNull();
      expect(getContrastRatio(style!.color, style!.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("範囲外のレベルにはスタイルを返さない", () => {
    expect(getSkillLevelStyle(0)).toBeNull();
    expect(getSkillLevelStyle(6)).toBeNull();
  });
});
