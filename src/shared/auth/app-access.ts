export const appRoles = ["ADMIN", "MANAGER", "MEMBER"] as const;

export type AppRole = (typeof appRoles)[number];

type NavigationIcon =
  | "dashboard"
  | "members"
  | "skillMap"
  | "skills"
  | "roles"
  | "mySkills"
  | "approvals"
  | "notifications"
  | "csv"
  | "auditLogs";

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
    label: "Overview",
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: "dashboard", allowedRoles: allRoles }
    ]
  },
  {
    label: "People",
    items: [
      { href: "/members", label: "メンバー", icon: "members", allowedRoles: managementRoles },
      { href: "/skill-map", label: "スキルマップ", icon: "skillMap", allowedRoles: managementRoles },
      { href: "/skills", label: "スキル管理", icon: "skills", allowedRoles: managementRoles },
      { href: "/roles", label: "ロール管理", icon: "roles", allowedRoles: managementRoles }
    ]
  },
  {
    label: "Workflow",
    items: [
      { href: "/my/skills", label: "自分のスキル", icon: "mySkills", allowedRoles: allRoles },
      { href: "/skill-approvals", label: "スキル承認", icon: "approvals", allowedRoles: managementRoles },
      { href: "/notifications", label: "通知", icon: "notifications", allowedRoles: allRoles }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/csv", label: "CSV", icon: "csv", allowedRoles: adminOnly },
      { href: "/audit-logs", label: "監査ログ", icon: "auditLogs", allowedRoles: adminOnly }
    ]
  }
] as const;

const nonNavigationRoutes: readonly Pick<AppNavigationItem, "href" | "allowedRoles">[] = [
  { href: "/account/password", allowedRoles: allRoles }
];
const appRouteRules: readonly Pick<AppNavigationItem, "href" | "allowedRoles">[] = [
  ...appNavigationGroups.flatMap((group) => group.items),
  ...nonNavigationRoutes
];

export function getNavigationGroupsForRole(role: AppRole): AppNavigationGroup[] {
  return appNavigationGroups.flatMap((group) => {
    const items = group.items.filter((item) => item.allowedRoles.includes(role));
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