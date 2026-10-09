import { describe, expect, it } from "vitest";

import { canUpdateMemberTargetRole } from "@/modules/members/domain/member-target-role-policy";

describe("canUpdateMemberTargetRole", () => {
  it("本人は自分の目標ロールを更新できる", () => {
    expect(canUpdateMemberTargetRole("MEMBER", "member-1", "member-1")).toBe(true);
    expect(canUpdateMemberTargetRole("MANAGER", "manager-1", "manager-1")).toBe(true);
  });

  it("ADMIN以外は他人の目標ロールを更新できない", () => {
    expect(canUpdateMemberTargetRole("MEMBER", "member-1", "member-2")).toBe(false);
    expect(canUpdateMemberTargetRole("MANAGER", "manager-1", "member-2")).toBe(false);
    expect(canUpdateMemberTargetRole("ADMIN", "admin-1", "member-2")).toBe(true);
  });
});
