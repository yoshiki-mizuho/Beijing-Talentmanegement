import { describe, expect, it } from "vitest";

import { skillInputSchema } from "@/modules/skills/domain/skill-schema";

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
});
