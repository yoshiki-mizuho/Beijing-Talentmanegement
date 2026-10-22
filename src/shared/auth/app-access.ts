export const appRoles = ["ADMIN", "MANAGER", "MEMBER"] as const;

export type AppRole = (typeof appRoles)[number];

type NavigationIcon =
  | "dashboard"
  | "members"
  | "explore"
  | "skillMap"
  | "skills"
  | "roles"
  | "mySkills"
  | "profile"
  | "approvals"
  | "csv"
  | "auditLogs"
  | "aiUsage";

export type AppNavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
  allowedRoles: readonly AppRole[];
};

export type AppNavigationGroup = {
  label: string;
  items: readonly AppNavigationItem[];
};

const allRoles = appRoles;
const managementRoles = ["ADMIN", "MANAGER"] as const satisfies readonly AppRole[];
const adminOnly = ["ADMIN"] as const satisfies readonly AppRole[];

export const appNavigationGroups: readonly AppNavigationGroup[] = [
  {
    label: "概要",
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: "dashboard", allowedRoles: allRoles }
    ]
  },
  {
    label: "メンバーの機能",
    items: [
      { href: "/my/skills", label: "自分のスキル", icon: "mySkills", allowedRoles: allRoles },
      { href: "/explore", label: "得意な人を探す", icon: "explore", allowedRoles: allRoles },
      { href: "/roles", label: "ロール", icon: "roles", allowedRoles: allRoles },
      { href: "/people/:memberId", label: "プロフィール", icon: "profile", allowedRoles: allRoles }
    ]
  },
  {
    label: "マネージャーの機能",
    items: [
      { href: "/skill-approvals", label: "スキル承認", icon: "approvals", allowedRoles: managementRoles },
      { href: "/members", label: "メンバー", icon: "members", allowedRoles: managementRoles },
      { href: "/skill-map", label: "スキルマップ", icon: "skillMap", allowedRoles: managementRoles }
    ]
  },
  {
    label: "管理者の機能",
    items: [
      { href: "/skills", label: "スキル管理", icon: "skills", allowedRoles: adminOnly },
      { href: "/csv", label: "CSV", icon: "csv", allowedRoles: adminOnly },
      { href: "/audit-logs", label: "監査ログ", icon: "auditLogs", allowedRoles: adminOnly },
      { href: "/ai-usage", label: "AI の利用状況", icon: "aiUsage", allowedRoles: adminOnly }
    ]
  }
] as const;

const nonNavigationRoutes: readonly Pick<AppNavigationItem, "href" | "allowedRoles">[] = [
  { href: "/account/password", allowedRoles: allRoles },
  { href: "/people", allowedRoles: allRoles },
  { href: "/notifications", allowedRoles: allRoles }
];
const appRouteRules: readonly Pick<AppNavigationItem, "href" | "allowedRoles">[] = [
  ...appNavigationGroups.flatMap((group) => group.items),
  ...nonNavigationRoutes
];

export function getNavigationGroupsForRole(role: AppRole, memberId: string): AppNavigationGroup[] {
  return appNavigationGroups.flatMap((group) => {
    const items = group.items
      .filter((item) => item.allowedRoles.includes(role))
      .map((item) => ({
        ...item,
        href: item.href.replace(":memberId", encodeURIComponent(memberId))
      }));
    return items.length > 0 ? [{ label: group.label, items }] : [];
  });
}

export function canAccessAppPath(role: AppRole, pathname: string): boolean {
  const rule = appRouteRules.find((candidate) => isSameOrNestedPath(pathname, candidate.href));

  // New application screens are closed to non-admin roles until explicitly classified.
  return rule ? rule.allowedRoles.includes(role) : role === "ADMIN";
}

export function getUnauthorizedRedirectPath(): "/dashboard" {
  return "/dashboard";
}

export function isSameOrNestedPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
