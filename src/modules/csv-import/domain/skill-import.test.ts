import { describe, expect, it } from "vitest";
import { validateSkillImport } from "./skill-import";

const record = (
  row: number,
  code: string,
  name: string,
  category = "開発",
) => ({
  row,
  values: {
    skill_code: code,
    skill_name: name,
    category_name: category,
    description: "",
    is_active: "true",
  },
});
const categories = [{ id: "cat", name: "開発" }];
const existing = [
  {
    id: "skill",
    code: "SKILL-0002",
    name: "既存",
    categoryId: "cat",
    categoryName: "開発",
    description: null,
    isActive: true,
  },
];

describe("skill import", () => {
  it("空コードの新規行に連番を割り当てる", () => {
    const result = validateSkillImport(
      [record(2, "", "新規1"), record(3, "", "新規2")],
      existing,
      categories,
    );
    expect(result.changes.map((change) => change.code)).toEqual([
      "SKILL-0003",
      "SKILL-0004",
    ]);
  });

  it("未知コード・未知カテゴリ・同カテゴリ同名を検出する", () => {
    const result = validateSkillImport(
      [record(2, "UNKNOWN", "既存"), record(3, "", "別", "未知")],
      existing,
      categories,
    );
    const messages = result.errors.map((error) => error.message).join(" ");
    expect(messages).toMatch(/スキルコード UNKNOWN/);
    expect(messages).toMatch(/カテゴリ 未知/);
    expect(messages).toMatch(/同じ名前/);
    expect(result.changes).toEqual([]);
  });

  it("エラーのある行を変更一覧に含めない", () => {
    const result = validateSkillImport(
      [record(2, "", "新規"), record(3, "UNKNOWN", "不正")],
      existing,
      categories,
    );

    expect(result.changes.map((change) => change.row)).toEqual([2]);
  });
});
