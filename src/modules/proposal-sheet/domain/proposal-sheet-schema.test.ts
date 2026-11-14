import { describe, expect, it } from "vitest";
import { keepDescriptionsFor, keepKnownIds } from "./proposal-sheet-schema";

describe("keepKnownIds", () => {
  it("そのメンバーの id だけを、重複なく残す", () => {
    expect(keepKnownIds(["p1", "other", "p1", "p2"], ["p1", "p2"])).toEqual(["p1", "p2"]);
  });
});

describe("keepDescriptionsFor", () => {
  it("載せる経歴の説明文だけを残す", () => {
    expect(
      keepDescriptionsFor({ p1: "説明1", p2: "説明2", other: "x" }, ["p1"])
    ).toEqual({ p1: "説明1" });
  });
});
