import { describe, expect, it } from "vitest";

import { commonSkillLevelGuidesInputSchema } from "./skill-schema";

const validGuides = () =>
  [1, 2, 3, 4, 5].map((level) => ({ level, description: `Lv${level}の目安` }));

describe("commonSkillLevelGuidesInputSchema", () => {
  it("前後の空白を除いて受け付ける", () => {
    const guides = validGuides();
    guides[0].description = "  目安  ";
    expect(
      commonSkillLevelGuidesInputSchema.parse({ guides }).guides[0].description,
    ).toBe("目安");
  });

  it.each(["", "   "])("空の文章を拒否する: %j", (description) => {
    const guides = validGuides();
    guides[0].description = description;
    expect(
      commonSkillLevelGuidesInputSchema.safeParse({ guides }).success,
    ).toBe(false);
  });

  it("201文字を拒否する", () => {
    const guides = validGuides();
    guides[0].description = "あ".repeat(201);
    expect(
      commonSkillLevelGuidesInputSchema.safeParse({ guides }).success,
    ).toBe(false);
  });

  it("levelの欠けを拒否する", () => {
    const guides = validGuides();
    guides[4].level = 4;
    expect(
      commonSkillLevelGuidesInputSchema.safeParse({ guides }).success,
    ).toBe(false);
  });
});
