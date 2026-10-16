import { describe, expect, it } from "vitest";
import { diffForAudit } from "./audit-diff";

describe("diffForAudit", () => {
  it("returns only changed fields", () => {
    expect(diffForAudit({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({
      before: { b: 2 },
      after: { b: 3 },
      changedFields: ["b"],
    });
  });

  it("returns null without changes", () => {
    expect(diffForAudit({ a: 1 }, { a: 1 })).toBeNull();
  });

  it("redacts values", () => {
    expect(
      diffForAudit(
        { profile: "old" },
        { profile: "new" },
        { redactedFields: ["profile"] },
      ),
    ).toEqual({ before: {}, after: {}, changedFields: ["profile"] });
  });

  it("normalizes dates", () => {
    expect(
      diffForAudit(
        { at: new Date("2020-01-01Z") },
        { at: new Date("2021-01-01Z") },
      )?.after,
    ).toEqual({ at: "2021-01-01T00:00:00.000Z" });
  });

  it("treats undefined as null", () => {
    expect(diffForAudit({ a: undefined }, { a: null })).toBeNull();
  });
});
