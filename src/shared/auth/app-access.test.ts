import { describe, expect, it } from "vitest";

import {
  canAccessAppPath,
  getNavigationGroupsForRole,
  isSameOrNestedPath,
  type AppRole
} from "@/shared/auth/app-access";

const expectedNavigation = {
  ADMIN: [
    "/talent/dashboard",
    "/talent/my/skills",
    "/talent/explore",
    "/talent/roles",
    "/talent/people/member-admin",
    "/talent/skill-approvals",
    "/talent/members",
    "/talent/skill-map",
    "/talent/skills",
    "/talent/skill-sheet-templates",
    "/talent/csv",
    "/talent/audit-logs",
    "/talent/ai-usage"
  ],
  MANAGER: [
    "/talent/dashboard",
    "/talent/my/skills",
    "/talent/explore",
    "/talent/roles",
    "/talent/people/member-manager",
    "/talent/skill-approvals",
    "/talent/members",
    "/talent/skill-map"
  ],
  MEMBER: ["/talent/dashboard", "/talent/my/skills", "/talent/explore", "/talent/roles", "/talent/people/member-member"]
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
    expect(canAccessAppPath("ADMIN", "/talent/audit-logs")).toBe(true);
    expect(canAccessAppPath("ADMIN", "/talent/future-screen")).toBe(true);
    expect(canAccessAppPath("ADMIN", "/future-screen")).toBe(false);
  });

  it("MANAGERはCSVと監査ログへアクセスできない", () => {
    expect(canAccessAppPath("MANAGER", "/talent/members")).toBe(true);
    expect(canAccessAppPath("MANAGER", "/talent/csv")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/talent/audit-logs/2026")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/talent/ai-usage")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/talent/skills")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/talent/roles")).toBe(true);
  });

  it("提案用スキルシートはADMINとMANAGERがアクセスでき、MEMBERはアクセスできない", () => {
    expect(canAccessAppPath("ADMIN", "/talent/proposal-sheets/member-id")).toBe(true);
    expect(canAccessAppPath("MANAGER", "/talent/proposal-sheets/member-id")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/proposal-sheets/member-id")).toBe(false);
  });

  it("AIの利用状況はADMINだけがアクセスできる", () => {
    expect(canAccessAppPath("ADMIN", "/talent/ai-usage")).toBe(true);
    expect(canAccessAppPath("MANAGER", "/talent/ai-usage")).toBe(false);
    expect(canAccessAppPath("MEMBER", "/talent/ai-usage")).toBe(false);
  });

  it("スキルシートのひな形はADMINだけがアクセスできる", () => {
    expect(canAccessAppPath("ADMIN", "/talent/skill-sheet-templates")).toBe(true);
    expect(canAccessAppPath("MANAGER", "/talent/skill-sheet-templates")).toBe(false);
    expect(canAccessAppPath("MEMBER", "/talent/skill-sheet-templates")).toBe(false);
  });

  it("MEMBERはメンバー向け画面へアクセスでき、管理画面へアクセスできない", () => {
    expect(canAccessAppPath("MEMBER", "/talent/dashboard")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/explore")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/people/member-id")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/my/skills/history")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/notifications")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/roles")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/level-ups/change-1")).toBe(true);
    expect(canAccessAppPath("MEMBER", "/talent/members")).toBe(false);
    expect(canAccessAppPath("MEMBER", "/talent/skill-approvals")).toBe(false);
  });

  it("パス境界を越えた前方一致を許可しない", () => {
    expect(isSameOrNestedPath("/csv-import", "/talent/csv")).toBe(false);
    expect(canAccessAppPath("MANAGER", "/csv-import")).toBe(false);
  });
});
