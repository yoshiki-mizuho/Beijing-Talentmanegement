import { describe, expect, it } from "vitest";

import { resolveSkillLevelDescription } from "@/modules/skills/domain/skill-level-guide";

const commonGuides = [
  { level: 1, description: "共通の目安1" },
  { level: 2, description: "共通の目安2" }
];

describe("resolveSkillLevelDescription", () => {
  it("スキルごとの目安を優先する", () => {
    expect(
      resolveSkillLevelDescription(2, commonGuides, [
        { level: 2, description: "個別の目安2" }
      ])
    ).toBe("個別の目安2");
  });

  it("スキルごとの目安がなければ共通の目安を返す", () => {
    expect(resolveSkillLevelDescription(1, commonGuides, [])).toBe("共通の目安1");
  });

  it("どちらの目安もなければ undefined を返す", () => {
    expect(resolveSkillLevelDescription(3, commonGuides, [])).toBeUndefined();
  });
});
