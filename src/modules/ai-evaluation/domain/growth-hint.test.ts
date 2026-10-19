import { describe, expect, it } from "vitest";

import { aiGrowthHintSchema } from "./growth-hint";
import { createFallbackGrowthHint } from "./growth-hint-fallback";
import {
  hashGrowthHintInput,
  serializeGrowthHintInput,
  type GrowthHintInput,
} from "./growth-hint-input";

const input: GrowthHintInput = {
  approvedSkills: [
    { skillId: "b", name: "設計", category: "開発", level: 4 },
    { skillId: "a", name: "TypeScript", category: "開発", level: 5 },
  ],
  targetRole: {
    name: "テックリード",
    requirements: [
      { skillId: "b", name: "設計", requiredLevel: 5 },
      { skillId: "a", name: "TypeScript", requiredLevel: 4 },
    ],
  },
  skillGaps: [
    { skillId: "b", name: "設計", currentLevel: 4, requiredLevel: 5 },
  ],
  recentGrowth: [
    { skillId: "a", name: "TypeScript", fromLevel: 4, toLevel: 5 },
  ],
};

describe("growth hint domain", () => {
  it("個人を特定する情報を入力に含めない", () => {
    const serialized = serializeGrowthHintInput(input);
    expect(serialized).not.toMatch(/氏名|メール|社員番号|部署名|自己紹介|1on1/);
    expect(Object.keys(input)).toEqual([
      "approvedSkills",
      "targetRole",
      "skillGaps",
      "recentGrowth",
    ]);
  });

  it("配列の並び順が変わっても同じハッシュになる", () => {
    const reversed: GrowthHintInput = {
      ...input,
      approvedSkills: [...input.approvedSkills].reverse(),
      targetRole: input.targetRole
        ? {
            ...input.targetRole,
            requirements: [...input.targetRole.requirements].reverse(),
          }
        : null,
    };
    expect(hashGrowthHintInput(reversed)).toBe(hashGrowthHintInput(input));
  });

  it("AI応答の字数、件数、必須キーを検証する", () => {
    expect(() =>
      aiGrowthHintSchema.parse({ strengthsSummary: "強み" }),
    ).toThrow();
    expect(() =>
      aiGrowthHintSchema.parse({
        strengthsSummary: "強み",
        nextSteps: [],
        oneOnOneTopics: ["話題"],
      }),
    ).toThrow();
    expect(() =>
      aiGrowthHintSchema.parse({
        strengthsSummary: "強み",
        nextSteps: ["あ".repeat(81)],
        oneOnOneTopics: ["話題"],
      }),
    ).toThrow();
  });

  it("簡易版を不足スキルと得意なことから作る", () => {
    const result = createFallbackGrowthHint(input);
    expect(result.strengthsSummary).toContain("設計");
    expect(result.nextSteps[0]).toContain("Lv5");
    expect(result.oneOnOneTopics[0]).toContain("設計");
  });
});
