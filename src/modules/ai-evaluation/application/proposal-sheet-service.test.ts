import { describe, expect, it } from "vitest";

import { limitProposalSheetInput } from "./proposal-sheet-service";

describe("limitProposalSheetInput", () => {
  it("基盤LLMへ渡す入力を目安3000文字以内へ絞る", () => {
    const projects = Array.from({ length: 30 }, (_, index) => ({
      id: `project-${index}`,
      title: "案件".repeat(20),
      period: "2020年1月〜現在",
      industry: "業界",
      summary: "説明".repeat(500),
      role: "役割",
      teamSize: "10名",
      businessArea: null,
      phases: Array(20).fill("設計"),
      technologies: Array(20).fill("TypeScript"),
    }));
    const limited = limitProposalSheetInput({
      itExperienceYears: "10年",
      note: "ひとこと".repeat(500),
      customerRequest: "要望".repeat(500),
      skills: Array.from({ length: 100 }, (_, index) => ({
        id: `skill-${index}`, name: `スキル${index}`, category: "開発", level: 3,
      })),
      projects,
      certifications: [],
    });
    expect(JSON.stringify(limited).length).toBeLessThanOrEqual(3_000);
  });
});
