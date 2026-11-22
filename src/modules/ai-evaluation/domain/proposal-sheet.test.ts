import { describe, expect, it } from "vitest";
import {
  buildProposalSheetMessages,
  createFallbackProposalSheet,
  hashProposalSheetInput,
  parseProposalSheetResponse,
  type ProposalSheetPromptInput
} from "./proposal-sheet";

const input: ProposalSheetPromptInput = {
  itExperienceYears: "3年",
  note: "丁寧に進めます",
  customerRequest: "設計経験",
  skills: [{ id: "s1", name: "TypeScript", category: "言語", level: 4 }],
  projects: [{
    id: "p1", title: "刷新", period: "2025年1月〜現在", industry: "製造",
    summary: "受注管理を刷新", role: "メンバー", teamSize: "5〜9人",
    businessArea: null, phases: ["基本設計"], technologies: ["TypeScript"]
  }],
  certifications: [{ name: "基本情報技術者", acquiredMonth: "2024-04" }]
};

describe("proposal sheet AI input", () => {
  it("匿名の入力だけをプロンプトへ入れる", () => {
    const text = JSON.stringify(buildProposalSheetMessages(input));
    expect(text).toContain("TypeScript");
    expect(text).not.toContain("email");
    expect(text).not.toContain("displayName");
    expect(text).not.toContain("node");
  });
  it("応答を切り詰め、未知のidを捨て、不足分を概要で補う", () => {
    const result = parseProposalSheetResponse(JSON.stringify({
      selfPr: "a".repeat(900), strengths: "b".repeat(300),
      projects: [{ id: "unknown", description: "x" }]
    }), input);
    expect(result.selfPr).toHaveLength(800);
    expect(result.strengths).toHaveLength(200);
    expect(result.projects).toEqual([{ id: "p1", description: "受注管理を刷新" }]);
  });
  it("コードブロックで囲まれたJSONも読める", () => {
    const body = JSON.stringify({
      selfPr: "自己PR",
      strengths: "設計",
      projects: [{ id: "p1", description: "説明" }]
    });
    const result = parseProposalSheetResponse("```json\n" + body + "\n```", input);
    expect(result.selfPr).toBe("自己PR");
    expect(result.projects).toEqual([{ id: "p1", description: "説明" }]);
  });
  it("壊れたJSONを拒否する", () => {
    expect(() => parseProposalSheetResponse("bad", input)).toThrow("invalid_response");
  });
  it("簡易版とハッシュを安定して作る", () => {
    expect(createFallbackProposalSheet(input).selfPr).toBe("丁寧に進めます");
    expect(hashProposalSheetInput(input)).toBe(hashProposalSheetInput(input));
  });
});
