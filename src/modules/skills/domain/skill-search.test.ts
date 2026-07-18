import { describe, expect, it } from "vitest";

import { skillSearchSchema } from "@/modules/skills/domain/skill-search";

describe("skillSearchSchema", () => {
  it("coerces active state filters", () => {
    expect(skillSearchSchema.parse({ q: "ts", isActive: "false" })).toEqual({
      q: "ts",
      isActive: false
    });
  });

  it("accepts typed boolean filters from application callers", () => {
    expect(skillSearchSchema.parse({ isActive: true })).toEqual({ isActive: true });
  });

  it("treats an empty active-state query as omitted", () => {
    expect(skillSearchSchema.parse({ isActive: "" })).toEqual({ isActive: undefined });
  });

  it("rejects invalid active-state filters", () => {
    expect(() => skillSearchSchema.parse({ isActive: "yes" })).toThrow();
  });
});
