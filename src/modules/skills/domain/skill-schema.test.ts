import { describe, expect, it } from "vitest";

import {
  createSkillInputSchema,
  reorderSkillsInputSchema,
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
