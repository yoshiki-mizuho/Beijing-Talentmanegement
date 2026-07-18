import { describe, expect, it } from "vitest";

import { memberSearchSchema } from "@/modules/members/domain/member-search";

describe("memberSearchSchema", () => {
  it("coerces minLevel and accepts optional filters", () => {
    expect(
      memberSearchSchema.parse({
        q: "dev",
        minLevel: "3",
        status: "ACTIVE"
      })
    ).toEqual({
      q: "dev",
      minLevel: 3,
      status: "ACTIVE"
    });
  });

  it("rejects invalid levels", () => {
    expect(() => memberSearchSchema.parse({ minLevel: "6" })).toThrow();
  });

  it("treats an empty level query as omitted", () => {
    expect(memberSearchSchema.parse({ minLevel: "" })).toEqual({ minLevel: undefined });
  });
});
