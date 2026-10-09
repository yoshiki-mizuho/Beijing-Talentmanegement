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
    "/members",
    "/skill-map",
    "/skills",
    "/roles",
    "/my/skills",
    "/skill-approvals",
    "/notifications",
    "/csv",
    "/audit-logs"
  ],
  MANAGER: [
    "/dashboard",
    "/members",
    "/skill-map",
    "/skills",
    "/roles",
    "/my/skills",
    "/skill-approvals",
    "/notifications"
  ],
  MEMBER: ["/dashboard", "/my/skills", "/notifications"]
} satisfies Record<AppRole, string[]>;

describe("application route access", () => {
  it.each(Object.entries(expectedNavigation) as [AppRole, string[]][])(
    "%sのナビゲーションを許可画面に限定する",
    (role, expected) => {
      const hrefs = getNavigationGroupsForRole(role).flatMap((group) =>
        group.items.map((item) => item.href)
      );

      expect(hrefs).toEqual(expected);
    }
  );

  it("ナビゲーショングループ名を日本語で返す", () => {
    expect(getNavigationGroupsForRole("ADMIN").map((group) => group.label)).toEqual([
      "概要",
      "人材・スキル",
      "申請・通知",
      "運用"
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
  });

  it("MEMBERはダッシュボード、自分のスキル、通知だけへアクセスできる", () => {
    expect(canAccessAppPath("MEMBER", "/dashboard")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/my/skills/history")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/notifications")).toBe(true);
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
