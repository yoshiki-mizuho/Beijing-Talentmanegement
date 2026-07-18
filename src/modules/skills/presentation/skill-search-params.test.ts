import { describe, expect, it } from "vitest";

import { buildSkillSearchParams } from "@/modules/skills/presentation/skill-search-params";

describe("buildSkillSearchParams", () => {
  it("指定された検索条件だけをAPIクエリへ変換する", () => {
    const result = buildSkillSearchParams({
      q: " TypeScript ",
      categoryId: "category-1",
      isActive: "true"
    });

    expect(result.toString()).toBe(
      "q=TypeScript&categoryId=category-1&isActive=true"
    );
  });

  it("空の検索条件は送信しない", () => {
    const result = buildSkillSearchParams({
      q: " ",
      categoryId: "",
      isActive: ""
    });

    expect(result.toString()).toBe("");
  });
});
