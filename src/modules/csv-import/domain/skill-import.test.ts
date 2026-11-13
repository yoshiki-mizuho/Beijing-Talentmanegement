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
    level_guide_1: "",
    level_guide_2: "",
    level_guide_3: "",
    level_guide_4: "",
    level_guide_5: "",
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
    levelGuides: [
      { level: 1, description: "既存Lv1" },
      { level: 2, description: "既存Lv2" },
    ],
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

  it("同カテゴリ同名を検出し、未知コードと未知カテゴリは新規扱いにする", () => {
    const result = validateSkillImport(
      [record(2, "UNKNOWN", "既存"), record(3, "", "別", "未知")],
      existing,
      categories,
    );
    const messages = result.errors.map((error) => error.message).join(" ");
    expect(messages).toMatch(/同じ名前/);
    expect(result.changes).toEqual([
      expect.objectContaining({ categoryName: "未知", categoryId: "new:未知" }),
    ]);
  });

  it("エラーのある行を変更一覧に含めない", () => {
    const result = validateSkillImport(
      [record(2, "", "新規"), record(3, "UNKNOWN", "")],
      existing,
      categories,
    );

    expect(result.changes.map((change) => change.row)).toEqual([2]);
  });

  it("目安の列がない旧形式では既存の目安を変更しない", () => {
    const result = validateSkillImport(
      [record(2, "SKILL-0002", "既存")],
      existing,
      categories,
    );

    expect(result.changes[0]).toMatchObject({
      kind: "unchanged",
      levelGuides: null,
      changes: {},
    });
  });

  it("目安だけの変更、同じ値、空欄への置き換えを差分にする", () => {
    const changed = record(2, "SKILL-0002", "既存");
    changed.values.level_guide_1 = "更新Lv1";
    changed.values.level_guide_2 = "既存Lv2";
    const changedResult = validateSkillImport(
      [changed],
      existing,
      categories,
      true,
    );
    expect(changedResult.changes[0]).toMatchObject({
      kind: "update",
      changes: {
        levelGuide1: { before: "既存Lv1", after: "更新Lv1" },
      },
    });

    const same = record(2, "SKILL-0002", "既存");
    same.values.level_guide_1 = "既存Lv1";
    same.values.level_guide_2 = "既存Lv2";
    expect(
      validateSkillImport([same], existing, categories, true).changes[0].kind,
    ).toBe("unchanged");

    const cleared = record(2, "SKILL-0002", "既存");
    expect(
      validateSkillImport([cleared], existing, categories, true).changes[0],
    ).toMatchObject({
      kind: "update",
      changes: {
        levelGuide1: { before: "既存Lv1", after: "" },
        levelGuide2: { before: "既存Lv2", after: "" },
      },
    });
  });

  it("目安を前後空白を除いて300文字までにする", () => {
    const valid = record(2, "SKILL-0002", "既存");
    valid.values.level_guide_1 = `  ${"a".repeat(300)}  `;
    const invalid = record(3, "", "新規");
    invalid.values.level_guide_3 = "a".repeat(301);
    const result = validateSkillImport(
      [valid, invalid],
      existing,
      categories,
      true,
    );

    expect(result.changes[0].levelGuides?.[0].description).toHaveLength(300);
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 3, column: "level_guide_3" }),
    ]);
  });

  it("DBにない新しいコードは32文字までにする", () => {
    const result = validateSkillImport(
      [record(2, "A".repeat(33), "長いコード")],
      existing,
      categories,
    );

    expect(result.errors).toEqual([
      expect.objectContaining({ row: 2, column: "skill_code" }),
    ]);
    expect(result.changes).toEqual([]);
  });

  it("DBにないコードの新規スキルにも目安を設定できる", () => {
    const newSkill = record(2, "NEW-SKILL", "コード付き新規");
    newSkill.values.level_guide_1 = "新規Lv1";
    const result = validateSkillImport(
      [newSkill],
      existing,
      categories,
      true,
    );

    expect(result.errors).toEqual([]);
    expect(result.changes[0]).toMatchObject({
      kind: "new",
      code: "NEW-SKILL",
    });
    expect(result.changes[0].levelGuides?.[0]).toEqual({
      level: 1,
      description: "新規Lv1",
    });
  });
});
