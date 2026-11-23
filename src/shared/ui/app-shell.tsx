"use client";

import type { Notification } from "@prisma/client";

import {
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronDown,
  ClipboardCheck,
  Compass,
  FileSpreadsheet,
  Ellipsis,
  Library,
  Map,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  type LucideIcon
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { SignOutButton } from "@/modules/auth/presentation/sign-out-button";
import {
  getNavigationGroupsForRole,
  isSameOrNestedPath,
  type AppNavigationItem,
  type AppRole
} from "@/shared/auth/app-access";
import { NotificationIndicator } from "@/shared/ui/notification-indicator";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import type { SetupProgress } from "@/shared/ui/setup-progress";
import { Tooltip } from "@/shared/ui/tooltip";
import { useDismissibleDetails } from "@/shared/ui/use-dismissible-details";

const navigationIcons = {
  dashboard: BarChart3,
  members: Users,
  skillMap: Map,
  skills: Library,
  roles: Target,
  mySkills: Sparkles,
  approvals: ClipboardCheck,
  profile: UserRound,
  csv: FileSpreadsheet,
  auditLogs: ShieldCheck,
  aiUsage: Bot,
  skillSheetTemplates: FileSpreadsheet,
  explore: Compass
} satisfies Record<AppNavigationItem["icon"], LucideIcon>;

const roleLabels: Record<AppRole, string> = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  MEMBER: "メンバー"
};

type AppShellProps = {
  user: {
    name?: string | null;
    email: string;
    role: AppRole;
    memberId: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
  };
  unreadNotificationCount: number;
  latestUnreadNotifications: Notification[];
  pendingApprovalCount: number;
  setupProgress: SetupProgress | null;
  children: ReactNode;
};

export function AppShell({
  user,
  unreadNotificationCount,
  latestUnreadNotifications,
  pendingApprovalCount,
  setupProgress,
  children
}: AppShellProps) {
  return (
    <StandardAppShell
      user={user}
      unreadNotificationCount={unreadNotificationCount}
      latestUnreadNotifications={latestUnreadNotifications}
      pendingApprovalCount={pendingApprovalCount}
      setupProgress={setupProgress}
    >
      {children}
    </StandardAppShell>
  );
}

function StandardAppShell({
  user,
  unreadNotificationCount,
  latestUnreadNotifications,
  pendingApprovalCount,
  setupProgress,
  children
}: AppShellProps) {
  const pathname = usePathname();
  const navigationGroups = getNavigationGroupsForRole(user.role, user.memberId);
  const contentWidth = getContentWidth(pathname);

  return (
    <div className="h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="hub-header fixed inset-x-0 top-0 z-[var(--hub-z-header)] flex h-[var(--hub-header-height)] items-center gap-[var(--hub-header-gap)] border-b border-[var(--hub-color-line)] bg-[var(--hub-color-surface)] px-[var(--hub-header-padding-x)] sm:px-[var(--hub-header-padding-x-wide)]">
        <Brand />

        <div className="min-w-4 flex-1" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-[var(--hub-header-item-gap)]">
          {setupProgress && !setupProgress.isComplete ? (
            <div>
              <SetupProgressIndicator progress={setupProgress} />
            </div>
          ) : null}
          <PrimaryAction role={user.role} pendingApprovalCount={pendingApprovalCount} />
          <NotificationIndicator
            unreadCount={unreadNotificationCount}
            notifications={latestUnreadNotifications}
            role={user.role}
          />
          <AccountMenu user={user} />
        </div>
      </header>

      <div className="mt-[var(--hub-header-height)] h-[calc(100dvh-var(--hub-header-height))] lg:grid lg:grid-cols-[var(--hub-nav-width)_minmax(0,1fr)]">
        <aside className="hidden h-full w-[var(--hub-nav-width)] flex-col border-r border-[var(--hub-color-line)] bg-[var(--hub-color-surface)] lg:flex">
          <DesktopNavigation
            groups={navigationGroups}
            pathname={pathname}
            pendingApprovalCount={pendingApprovalCount}
          />
        </aside>

        <main className="h-full overflow-y-auto px-[var(--hub-content-padding-x)] py-[var(--hub-content-padding-y)] pb-[var(--hub-bottom-nav-clearance)] sm:px-[var(--hub-content-padding-x-wide)] lg:pb-[var(--hub-content-padding-y)]">
          <div className={`mx-auto w-full ${contentWidth}`}>{children}</div>
        </main>
      </div>

      <BottomNavigation
        groups={navigationGroups}
        pathname={pathname}
        role={user.role}
      />
    </div>
  );
}

function Brand() {
  return (
    <Link
      href="/talent/dashboard"
      className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
      aria-label="TalentHub ダッシュボード"
    >
      <span className="inline-flex h-[var(--hub-header-mark-size)] w-[var(--hub-header-mark-size)] items-center justify-center rounded-[var(--hub-radius-lg)] bg-gradient-to-br from-[var(--hub-color-primary-600)] to-[var(--hub-color-primary-700)] text-[length:var(--hub-header-mark-text)] font-bold text-[var(--hub-color-text-on-primary)]">
        T
      </span>
      <span className="hidden text-[length:var(--hub-text-lg)] font-bold tracking-[var(--hub-tracking-tight)] text-[var(--hub-color-ink)] sm:inline">
        TalentHub
      </span>
    </Link>
  );
}

function PrimaryAction({
  role,
  pendingApprovalCount
}: {
  role: AppRole;
  pendingApprovalCount: number;
}) {
  const isMember = role === "MEMBER";
  const hasPendingApprovals = pendingApprovalCount > 0;
  const label = isMember
    ? "スキルを申請"
    : hasPendingApprovals
      ? `承認待ち ${pendingApprovalCount}件`
      : "承認待ちなし";
  const Icon = isMember ? Plus : ClipboardCheck;

  return (
    <Link
      href={(isMember ? "/talent/my/skills" : "/talent/skill-approvals") as Route}
      aria-label={label}
      title={label}
      className={`hidden h-[var(--hub-header-action-height)] items-center justify-center gap-[var(--hub-space-2)] rounded-[var(--hub-radius-header-action)] px-[var(--hub-space-3)] text-[length:var(--hub-text-sm)] font-semibold shadow-[var(--hub-shadow-sm)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 lg:inline-flex ${
        isMember || hasPendingApprovals
          ? "bg-[var(--primary)] !text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
          : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

function SetupProgressIndicator({ progress }: { progress: SetupProgress }) {
  const percentage = Math.round((progress.completedCount / progress.totalCount) * 100);
  const detailsRef = useDismissibleDetails();

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className="flex h-11 min-w-11 cursor-pointer list-none flex-col justify-center rounded-md px-1.5 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:min-w-[88px] sm:min-w-36 sm:px-2 [&::-webkit-details-marker]:hidden"
        aria-label={`はじめの3ステップ ${progress.completedCount} / ${progress.totalCount}`}
      >
        <span className="flex items-center justify-between gap-2 text-xs font-semibold">
          <span className="hidden sm:inline">
            はじめの3ステップ {progress.completedCount} / {progress.totalCount}
          </span>
          <span className="sm:hidden">
            {progress.completedCount}/{progress.totalCount}
          </span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
        <span
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"
          role="progressbar"
          aria-label="はじめの3ステップ進捗"
          aria-valuemin={0}
          aria-valuemax={progress.totalCount}
          aria-valuenow={progress.completedCount}
        >
          <span
            className="block h-full rounded-full bg-[var(--primary)]"
            style={{ width: `${percentage}%` }}
          />
        </span>
      </summary>
      <div className="fixed inset-x-3 top-[72px] z-50 w-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-72">
        <p className="text-sm font-semibold">はじめの3ステップ</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          得意なスキルは3つほど選ぶと1分ほどで終わります。あとから増やせます。
        </p>
        <ul className="mt-3 space-y-1">
          {progress.items.map((item) => (
            <li key={item.id}>
              {item.completed ? (
                <span className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm text-[var(--muted-foreground)]">
                  <Check className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href as Route}
                  className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="h-4 w-4 rounded-full border-2 border-[var(--border-strong)]" aria-hidden="true" />
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function AccountMenu({ user }: { user: AppShellProps["user"] }) {
  const name = user.name?.trim() || "ユーザー";
  const detailsRef = useDismissibleDetails();

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className="flex h-[var(--hub-header-icon-button)] w-[var(--hub-header-icon-button)] cursor-pointer list-none items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
        aria-label="アカウントメニューを開く"
      >
        <MemberAvatar
          memberId={user.memberId}
          name={name}
          avatarUrl={user.avatarUrl}
          avatarColor={user.avatarColor}
          className="h-[var(--hub-header-avatar)] w-[var(--hub-header-avatar)]"
        />
      </summary>
      <div className="absolute right-0 top-[calc(100%+var(--hub-space-2))] z-[var(--hub-z-dropdown)] w-[var(--hub-menu-width)] rounded-[var(--hub-radius-md)] border border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] p-[var(--hub-space-2)] shadow-[var(--hub-shadow-lg)]">
        <div className="border-b border-[var(--hub-color-border-subtle)] px-[var(--hub-space-2)] py-[var(--hub-space-2)]">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
            {user.email || roleLabels[user.role]}
          </p>
        </div>
        <Link
          href={`/talent/people/${user.memberId}` as Route}
          className="mt-1 flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <Sparkles className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          マイスキル
        </Link>
        <SignOutButton className="h-11 w-full justify-start px-2" />
      </div>
    </details>
  );
}

function DesktopNavigation({
  groups,
  pathname,
  pendingApprovalCount
}: {
  groups: ReturnType<typeof getNavigationGroupsForRole>;
  pathname: string;
  pendingApprovalCount: number;
}) {
  return (
    <nav className="flex flex-1 flex-col items-center py-[var(--hub-nav-padding-y)]" aria-label="メインナビゲーション">
      {groups.map((group, index) => (
        <div
          key={group.label}
          className={`grid w-full place-items-center gap-[var(--hub-nav-gap)] px-[var(--hub-nav-padding-x)] ${index > 0 ? "mt-[var(--hub-space-2)] border-t border-[var(--hub-color-line)] pt-[var(--hub-space-2)]" : ""}`}
        >
          {group.items.map((item) => (
            <DesktopNavigationLink
              key={item.href}
              item={item}
              active={isSameOrNestedPath(pathname, item.href)}
              hasUnread={item.icon === "approvals" && pendingApprovalCount > 0}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

function DesktopNavigationLink({
  item,
  active,
  hasUnread
}: {
  item: AppNavigationItem;
  active: boolean;
  hasUnread: boolean;
}) {
  const Icon = navigationIcons[item.icon];

  return (
    <Tooltip content={item.label} side="right">
      <Link
        href={item.href as Route}
        aria-label={item.label}
        title={item.label}
        aria-current={active ? "page" : undefined}
        className={`relative inline-flex h-[var(--hub-nav-item-size)] w-[var(--hub-nav-item-size)] items-center justify-center rounded-[var(--hub-radius-nav-item)] transition-colors duration-[var(--hub-duration)] ease-[var(--hub-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
          active
            ? "bg-[var(--hub-color-selected-bg)] text-[var(--hub-color-selected-text)]"
            : "text-[var(--hub-color-ink-2)] hover:bg-[var(--hub-color-frame-hover)]"
        }`}
      >
        <Icon
          className="h-[var(--hub-icon-size)] w-[var(--hub-icon-size)]"
          strokeWidth="var(--hub-icon-stroke)"
          aria-hidden="true"
        />
        {hasUnread ? (
          <span className="absolute right-[var(--hub-space-1-5)] top-[var(--hub-space-1-5)] h-[var(--hub-nav-dot-size)] w-[var(--hub-nav-dot-size)] rounded-full border-2 border-[var(--hub-color-surface)] bg-[var(--hub-color-badge-dot)]" aria-hidden="true" />
        ) : null}
      </Link>
    </Tooltip>
  );
}

function BottomNavigation({
  groups,
  pathname,
  role
}: {
  groups: ReturnType<typeof getNavigationGroupsForRole>;
  pathname: string;
  role: AppRole;
}) {
  const detailsRef = useDismissibleDetails();
  const items = groups.flatMap((group) => group.items);
  const preferredHrefs = role === "ADMIN"
    ? ["/talent/dashboard", "/talent/skills", "/talent/members", "/talent/skill-approvals"]
    : role === "MANAGER"
      ? ["/talent/dashboard", "/talent/skill-approvals", "/talent/members", "/talent/skill-map"]
      : ["/talent/dashboard", "/talent/my/skills", "/talent/explore"];
  const primaryItems = preferredHrefs.flatMap((href) => {
    const item = items.find((candidate) => candidate.href === href);
    return item ? [item] : [];
  });
  const remainingItems = items.filter(
    (item) => !primaryItems.some((primaryItem) => primaryItem.href === item.href)
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[var(--hub-z-bottom-nav)] grid h-[var(--hub-bottom-nav-height)] grid-flow-col auto-cols-fr border-t border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] lg:hidden"
      aria-label="下部ナビゲーション"
    >
      {primaryItems.map((item) => (
        <BottomNavigationLink key={item.href} item={item} pathname={pathname} />
      ))}
      {role === "MEMBER" ? (
        <BottomNavigationLink
          item={{
            href: "/talent/notifications",
            label: "通知",
            icon: "notifications"
          }}
          pathname={pathname}
        />
      ) : null}
      <details ref={detailsRef} className="group relative">
        <summary className="flex h-full cursor-pointer list-none flex-col items-center justify-center gap-[var(--hub-space-0-5)] text-[length:var(--hub-text-2xs)] text-[var(--hub-color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-color-focus)] [&::-webkit-details-marker]:hidden">
          <Ellipsis
            className="h-[var(--hub-icon-size)] w-[var(--hub-icon-size)]"
            strokeWidth="var(--hub-icon-stroke)"
            aria-hidden="true"
          />
          <span>そのほか</span>
        </summary>
        <div className="absolute bottom-[calc(100%+var(--hub-space-2))] right-[var(--hub-space-2)] z-[var(--hub-z-dropdown)] max-h-[60dvh] w-[var(--hub-menu-width)] overflow-y-auto rounded-[var(--hub-radius-md)] border border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] p-[var(--hub-space-2)] shadow-[var(--hub-shadow-lg)]">
          {remainingItems.map((item) => {
            const Icon = navigationIcons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className="flex min-h-10 items-center gap-[var(--hub-space-2)] rounded-[var(--hub-radius-md)] px-[var(--hub-space-3)] text-[length:var(--hub-text-sm)] hover:bg-[var(--hub-color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-color-focus)]"
              >
                <Icon className="h-[var(--hub-icon-size-sm)] w-[var(--hub-icon-size-sm)]" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </details>
    </nav>
  );
}

type BottomNavigationItem = Pick<AppNavigationItem, "href" | "label"> & {
  icon: AppNavigationItem["icon"] | "notifications";
};

function BottomNavigationLink({
  item,
  pathname
}: {
  item: BottomNavigationItem;
  pathname: string;
}) {
  const Icon = item.icon === "notifications" ? Bell : navigationIcons[item.icon];
  const active = isSameOrNestedPath(pathname, item.href);

  return (
    <Link
      href={item.href as Route}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-[var(--hub-space-0-5)] text-[length:var(--hub-text-2xs)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-color-focus)] ${
        active ? "text-[var(--hub-color-selected-text)]" : "text-[var(--hub-color-text-muted)]"
      }`}
    >
      <Icon
        className="h-[var(--hub-icon-size)] w-[var(--hub-icon-size)]"
        strokeWidth="var(--hub-icon-stroke)"
        aria-hidden="true"
      />
      <span>{item.label}</span>
    </Link>
  );
}

function getContentWidth(pathname: string) {
  if (isSameOrNestedPath(pathname, "/talent/dashboard")) {
    return "max-w-[var(--hub-content-max-full)]";
  }
  if (
    [
      "/talent/skills",
      "/talent/roles",
      "/talent/csv",
      "/talent/audit-logs",
      "/talent/ai-usage",
      "/talent/skill-sheet-templates",
      "/talent/members",
      "/talent/skill-map",
      "/talent/skill-approvals"
    ].some((href) => isSameOrNestedPath(pathname, href))
  ) {
    return "max-w-[var(--hub-content-max-wide)]";
  }
  if (
    ["/talent/my/skills", "/talent/proposal-sheets", "/talent/people"].some((href) =>
      isSameOrNestedPath(pathname, href)
    )
  ) {
    return "max-w-[var(--hub-content-max-form)]";
  }
  return "max-w-[var(--hub-content-max-reading)]";
}
