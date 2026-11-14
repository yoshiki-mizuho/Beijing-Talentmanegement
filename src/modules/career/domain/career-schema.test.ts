import { describe, expect, it } from "vitest";

import { certificationSchema, projectHistorySchema, splitTechnologies } from "./career-schema";

const validHistory = {
  title: "基幹システム刷新",
  startMonth: "2025-01",
  endMonth: "2025-12",
  industry: "製造",
  summary: "受注管理の刷新",
  role: "メンバー",
  teamSize: "5〜9人",
  businessArea: "事業管理",
  phases: ["基本設計"],
  technologies: "TypeScript、React"
};

describe("career schema", () => {
  it("技術を区切り、空と重複を除く", () => {
    expect(splitTechnologies(" TypeScript / React、TypeScript,, ")).toEqual([
      "TypeScript",
      "React"
    ]);
  });

  it("経歴の期間と選択肢を検証する", () => {
    expect(projectHistorySchema.safeParse(validHistory).success).toBe(true);
    expect(projectHistorySchema.safeParse({ ...validHistory, endMonth: "2024-12" }).success).toBe(false);
    expect(projectHistorySchema.safeParse({ ...validHistory, role: "主任" }).success).toBe(false);
  });

  it("未来の資格取得年月を拒否する", () => {
    expect(certificationSchema.safeParse({ name: "資格", acquiredMonth: "2999-01" }).success).toBe(false);
  });
});
