import { describe, expect, it } from "vitest";

import { getActiveReportError } from "./member-role-policy";

describe("member role policy", () => {
  it("在籍中の部下がいるメンバーの無効化を拒否する", () => {
    expect(getActiveReportError(1, "無効にできません")).toBe(
      "部下がいるメンバーは無効にできません。先に部下の上司を付け替えてください。",
    );
    expect(getActiveReportError(0, "無効にできません")).toBeNull();
  });
});
