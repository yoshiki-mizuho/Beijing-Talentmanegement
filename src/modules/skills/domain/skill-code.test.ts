import { describe, expect, it } from "vitest";

import { generateNextSkillCodeFromExistingCodes } from "@/modules/skills/domain/skill-code";

describe("generateNextSkillCodeFromExistingCodes", () => {
  it("starts at SKILL-0001 when no generated codes exist", () => {
    expect(generateNextSkillCodeFromExistingCodes([])).toBe("SKILL-0001");
  });

  it("uses the next number after existing generated codes", () => {
    expect(
      generateNextSkillCodeFromExistingCodes([
        "SKILL-0001",
        "LEGACY",
        "SKILL-0010"
      ])
    ).toBe("SKILL-0011");
  });
});
