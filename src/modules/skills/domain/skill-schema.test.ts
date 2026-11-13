import { describe, expect, it } from "vitest";

import {
  assignSkillCategoryGroupInputSchema,
  bulkAssignSkillCategoryGroupInputSchema,
  createSkillInputSchema,
  updateSkillInputSchema,
  reorderSkillCategoryGroupsInputSchema,
  reorderSkillsInputSchema,
  skillCategoryGroupInputSchema,
  skillInputSchema
} from "@/modules/skills/domain/skill-schema";

describe("skill schemas", () => {
  it("accepts valid skill input", () => {
    expect(
      skillInputSchema.parse({
        code: "TS",
        name: "TypeScript",
        categoryId: "category-1",
        description: "Typed JavaScript",
        isActive: true
      })
    ).toMatchObject({
      code: "TS",
      name: "TypeScript",
      isActive: true
    });
  });

  it("rejects missing skill code", () => {
    expect(() =>
      skillInputSchema.parse({
        code: "",
        name: "TypeScript",
        categoryId: "category-1"
      })
    ).toThrow();
  });

  it("does not require code when creating a skill", () => {
    expect(
      createSkillInputSchema.parse({
        name: "TypeScript",
        categoryId: "category-1",
        isActive: true
      })
    ).toMatchObject({
      name: "TypeScript",
      categoryId: "category-1"
    });
  });

  it("更新入力からコードを除外する", () => {
    expect(
      updateSkillInputSchema.parse({
        code: "書き換えたいコード",
        name: "TypeScript",
        categoryId: "category-1",
        isActive: true
      })
    ).not.toHaveProperty("code");
  });
});

describe("skill category group schemas", () => {
  it("1〜30文字の大分類名を受け付ける", () => {
    expect(skillCategoryGroupInputSchema.parse({ name: " 技術 " })).toEqual({ name: "技術" });
  });

  it.each(["", "あ".repeat(31)])("不正な大分類名を拒否する", (name) => {
    expect(() => skillCategoryGroupInputSchema.parse({ name })).toThrow();
  });

  it("重複した並び順と空のカテゴリIDを拒否する", () => {
    expect(() => reorderSkillCategoryGroupsInputSchema.parse({ groupIds: ["a", "a"] })).toThrow();
    expect(() => assignSkillCategoryGroupInputSchema.parse({ categoryId: "", groupId: null })).toThrow();
  });

  it("一括割り当ての正常な入力を受け付ける", () => {
    expect(bulkAssignSkillCategoryGroupInputSchema.parse({
      categoryIds: ["category-1", "category-2"],
      groupId: null
    })).toEqual({
      categoryIds: ["category-1", "category-2"],
      groupId: null
    });
  });

  it.each([
    { categoryIds: [], groupId: null },
    { categoryIds: ["category-1", "category-1"], groupId: null },
    { categoryIds: Array.from({ length: 201 }, (_, index) => `category-${index}`), groupId: null }
  ])("一括割り当ての不正なカテゴリID一覧を拒否する", (input) => {
    expect(() => bulkAssignSkillCategoryGroupInputSchema.parse(input)).toThrow();
  });
});

describe("reorderSkillsInputSchema", () => {
  const valid = {
    categories: [
      { categoryId: "category-1", skillIds: ["skill-1", "skill-2"] },
      { categoryId: "category-2", skillIds: [] },
    ],
  };

  it("カテゴリとスキルが重複しない入力を受け付ける", () => {
    expect(reorderSkillsInputSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    { categories: [...valid.categories, { categoryId: "category-1", skillIds: [] }] },
    { categories: [{ categoryId: "category-1", skillIds: ["skill-1", "skill-1"] }] },
  ])("重複したIDを拒否する", (input) => {
    expect(() => reorderSkillsInputSchema.parse(input)).toThrow(
      "一覧が更新されています。画面を開き直してください。",
    );
  });
});
