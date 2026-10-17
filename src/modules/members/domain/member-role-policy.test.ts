import { AuthRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getMemberRoleChangeError } from "./member-role-policy";

const base = {
  actorMemberId: "admin-1",
  targetMemberId: "member-1",
  currentRole: AuthRole.MEMBER,
  nextRole: AuthRole.MANAGER,
  activeAdminCount: 2,
  targetIsActive: true,
  reportCount: 0,
};

describe("member role policy", () => {
  it("自分自身の権限変更を拒否する", () => {
    expect(
      getMemberRoleChangeError({ ...base, targetMemberId: "admin-1" }),
    ).toBe("自分の権限は変更できません");
  });

  it("最後の在籍中 ADMIN の降格を拒否する", () => {
    expect(
      getMemberRoleChangeError({
        ...base,
        currentRole: AuthRole.ADMIN,
        nextRole: AuthRole.MANAGER,
        activeAdminCount: 1,
      }),
    ).toBe("管理者が1人もいなくなるため変更できません");
  });

  it("部下がいる利用者の MEMBER への変更を拒否する", () => {
    expect(
      getMemberRoleChangeError({
        ...base,
        currentRole: AuthRole.MANAGER,
        nextRole: AuthRole.MEMBER,
        reportCount: 3,
      }),
    ).toBe("部下が 3人いるため変更できません。先に上司を付け替えてください");
  });

  it("同じ権限への変更ではエラーにしない", () => {
    expect(
      getMemberRoleChangeError({
        ...base,
        currentRole: AuthRole.MANAGER,
        nextRole: AuthRole.MANAGER,
      }),
    ).toBeNull();
  });
});
