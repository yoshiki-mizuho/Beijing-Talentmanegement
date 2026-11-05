import { describe, expect, it } from "vitest";

import { buildSkillPrerequisiteMessages } from "./skill-prerequisite-prompt";
import { parseSkillPrerequisiteSuggestions } from "./skill-prerequisite-suggestion";

describe("skill prerequisite suggestions", () => {
  it("不正・重複・既存・逆向きを除き、理由を切り詰める", () => {
    const response = { suggestions: [
      { skill: 1, prerequisite: 2, reason: "a".repeat(61), confidence: "high" },
      { skill: 1, prerequisite: 2, reason: "重複", confidence: "high" },
      { skill: 2, prerequisite: 1, reason: "範囲外", confidence: "high" },
      { skill: 1, prerequisite: 3, reason: "既存の逆", confidence: "low" },
      { skill: 1, prerequisite: 9, reason: "不明", confidence: "high" }
    ] };
    const result = parseSkillPrerequisiteSuggestions(`\`\`\`json\n${JSON.stringify(response)}\n\`\`\``, {
      validNumbers: new Set([1, 2, 3]),
      targetNumbers: new Set([1]),
      existing: [{ skill: 3, prerequisite: 1 }]
    });
    expect(result).toHaveLength(1);
    expect(result[0].reason).toHaveLength(60);
    expect(result[0].reason.endsWith("…")).toBe(true);
  });

  it("プロンプト入力に個人データを含めない", () => {
    const messages = buildSkillPrerequisiteMessages({
      targets: [{ number: 1, name: "React", category: "開発" }],
      candidates: [{ number: 1, name: "React", category: "開発" }],
      existing: []
    });
    expect(messages[1].content).toBe('{"targets":[{"number":1,"name":"React","category":"開発"}],"candidates":[{"number":1,"name":"React","category":"開発"}],"existing":[]}');
    expect(messages[1].content).not.toMatch(/member|申請|保有/u);
  });
});
