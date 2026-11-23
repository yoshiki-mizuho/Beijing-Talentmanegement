import { describe, expect, it } from "vitest";

import { getActiveReportError } from "./member-role-policy";

describe("member role policy", () => {
  it("担当のメンバーがいるメンバーの無効化を拒否する", () => {
    expect(getActiveReportError(1, "無効にできません")).toBe(
      "担当のメンバーがいるため無効にできません。先にメンバーの上司を付け替えてください。",
    );
    expect(getActiveReportError(0, "無効にできません")).toBeNull();
  });
});
