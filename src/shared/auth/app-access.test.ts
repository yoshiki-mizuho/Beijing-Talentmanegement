import { describe, expect, it } from "vitest";

import {
  canAccessAppPath,
  getNavigationGroupsForRole,
  isSameOrNestedPath,
  type AppRole
} from "@/shared/auth/app-access";

const expectedNavigation = {
  ADMIN: [
    "/dashboard",
    "/my/skills",
    "/explore",
    "/roles",
    "/people/member-admin",
    "/skill-approvals",
    "/members",
    "/skill-map",
    "/skills",
    "/csv",
    "/audit-logs",
    "/ai-usage"
  ],
  MANAGER: [
    "/dashboard",
    "/my/skills",
    "/explore",
    "/roles",
    "/people/member-manager",
    "/skill-approvals",
    "/members",
    "/skill-map"
  ],
  MEMBER: ["/dashboard", "/my/skills", "/explore", "/roles", "/people/member-member"]
} satisfies Record<AppRole, string[]>;

describe("application route access", () => {
  it.each(Object.entries(expectedNavigation) as [AppRole, string[]][])(
    "%sのナビゲーションを許可画面に限定する",
    (role, expected) => {
      const hrefs = getNavigationGroupsForRole(role, `member-${role.toLowerCase()}`).flatMap((group) =>
        group.items.map((item) => item.href)
      );

      expect(hrefs).toEqual(expected);
    }
  );

  it("ナビゲーショングループ名を日本語で返す", () => {
    expect(getNavigationGroupsForRole("ADMIN", "member-admin").map((group) => group.label)).toEqual([
      "概要",
      "メンバーの機能",
      "マネージャーの機能",
      "管理者の機能"
    ]);
  });

  it("ADMINは定義済み画面と新規画面へアクセスできる", () => {
    expect(canAccessAppPath("ADMIN", "/audit-logs")).toBe(true);
    expect(canAccessAppPath("ADMIN", "/future-screen")).toBe(true);
  });

  it("MANAGERはCSVと監査ログへアクセスできない", () => {
    expect(canAccessAppPath("MANAGER", "/members")).toBe(true);
    expect(canAccessAppPath("MANAGER", "/csv")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/audit-logs/2026")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/ai-usage")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/skills")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/roles")).toBe(true);
  });

  it("AIの利用状況はADMINだけがアクセスできる", () => {
    expect(canAccessAppPath("ADMIN", "/ai-usage")).toBe(true);
    expect(canAccessAppPath("MANAGER", "/ai-usage")).toBe(false);
    expect(canAccessAppPath("MEMBER", "/ai-usage")).toBe(false);
  });

  it("MEMBERはメンバー向け画面へアクセスでき、管理画面へアクセスできない", () => {
    expect(canAccessAppPath("MEMBER", "/dashboard")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/explore")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/people/member-id")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/my/skills/history")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/notifications")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/roles")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/members")).toBe(false);
    expect(canAccessAppPath("MEMBER", "/skill-approvals")).toBe(false);
  });

  it("パスワード変更画面は全ロールが利用できる", () => {
    expect(canAccessAppPath("ADMIN", "/account/password")).toBe(true);
    expect(canAccessAppPath("MANAGER", "/account/password")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/account/password")).toBe(true);
  });

  it("パス境界を越えた前方一致を許可しない", () => {
    expect(isSameOrNestedPath("/csv-import", "/csv")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/csv-import")).toBe(false);
  });
});
