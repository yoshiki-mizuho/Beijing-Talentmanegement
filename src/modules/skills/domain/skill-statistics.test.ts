import { describe, expect, it } from "vitest";
import { calculateAverageSkillLevel } from "@/modules/skills/domain/skill-statistics";

describe("calculateAverageSkillLevel", () => {
  it("calculates a one-decimal average", () => {
    expect(calculateAverageSkillLevel([{ level: 3 }, { level: 4 }, { level: 4 }])).toBe(3.7);
  });
  it("returns zero when nobody has the skill", () => {
    expect(calculateAverageSkillLevel([])).toBe(0);
  });
});
