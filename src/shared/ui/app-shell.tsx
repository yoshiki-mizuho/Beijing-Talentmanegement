"use client";

import {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  Compass,
  FileSpreadsheet,
  KeyRound,
  Library,
  Map,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { SignOutButton } from "@/modules/auth/presentation/sign-out-button";
import {
  getNavigationGroupsForRole,
  isSameOrNestedPath,
  type AppNavigationItem,
  type AppRole
} from "@/shared/auth/app-access";
import { NotificationIndicator } from "@/shared/ui/notification-indicator";
import type { SetupProgress } from "@/shared/ui/setup-progress";
import { Tooltip } from "@/shared/ui/tooltip";

const navigationIcons = {
  dashboard: BarChart3,
  members: Users,
  skillMap: Map,
  skills: Library,
  roles: Target,
  mySkills: Sparkles,
  approvals: ClipboardCheck,
  notifications: Bell,
  csv: FileSpreadsheet,
  auditLogs: ShieldCheck,
  explore: Compass
} satisfies Record<AppNavigationItem["icon"], LucideIcon>;

const roleLabels: Record<AppRole, string> = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  MEMBER: "メンバー"
};

type AppShellProps = {
  user: { name?: string | null; role: AppRole; memberId: string };
  unreadNotificationCount: number;
  pendingApprovalCount: number;
  setupProgress: SetupProgress | null;
  children: ReactNode;
};

export function AppShell({
  user,
  unreadNotificationCount,
  pendingApprovalCount,
  setupProgress,
  children
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationGroups = getNavigationGroupsForRole(user.role);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4">
        <button
          ref={menuButtonRef}
          type="button"
          className="mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="ナビゲーションを開く"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <Brand />

        <div className="min-w-4 flex-1" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {setupProgress && !setupProgress.isComplete ? (
            <div>
              <SetupProgressIndicator progress={setupProgress} />
            </div>
          ) : null}
          <PrimaryAction role={user.role} pendingApprovalCount={pendingApprovalCount} />
          <NotificationIndicator unreadCount={unreadNotificationCount} />
          <AccountMenu user={user} />
        </div>
      </header>

      <div className="md:grid md:grid-cols-[64px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-16 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
          <DesktopNavigation groups={navigationGroups} pathname={pathname} />
        </aside>

        <main className="mx-auto w-full max-w-[1200px] p-4 md:p-6">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-0 bg-black/40"
            aria-label="ナビゲーションを閉じる"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={drawerRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="メインナビゲーション"
            className="relative flex h-full w-[min(320px,86vw)] flex-col bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-3">
              <Brand alwaysShowName />
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                onClick={() => setMobileOpen(false)}
                aria-label="ナビゲーションを閉じる"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <MobileNavigation
              groups={navigationGroups}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Brand({ alwaysShowName = false }: { alwaysShowName?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
      aria-label="TalentHub ダッシュボード"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-base font-bold text-[var(--primary-foreground)]">
        T
      </span>
      <span className={`${alwaysShowName ? "inline" : "hidden sm:inline"} text-base font-bold`}>
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
      href={(isMember ? "/my/skills" : "/skill-approvals") as Route}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${
        isMember || hasPendingApprovals
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
          : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

// <details> のポップオーバーを、Esc・外側クリック・リンク選択で閉じる。
// 外側クリックで閉じるので、別のポップオーバーを開くと前のものは閉じる。
function useDismissibleDetails() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(returnFocus: boolean) {
      const details = detailsRef.current;
      if (!details?.open) return;
      details.open = false;
      if (returnFocus) details.querySelector("summary")?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) close(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }

    function handleClick(event: MouseEvent) {
      if ((event.target as Element | null)?.closest("a")) close(false);
    }

    const details = detailsRef.current;
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    details?.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      details?.removeEventListener("click", handleClick);
    };
  }, []);

  return detailsRef;
}

function SetupProgressIndicator({ progress }: { progress: SetupProgress }) {
  const percentage = Math.round((progress.completedCount / progress.totalCount) * 100);
  const detailsRef = useDismissibleDetails();

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex h-11 min-w-[88px] cursor-pointer list-none flex-col justify-center rounded-md px-1.5 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:min-w-36 sm:px-2 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2 text-xs font-semibold">
          セットアップ {progress.completedCount}/{progress.totalCount}
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
        <span
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"
          role="progressbar"
          aria-label="セットアップ進捗"
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
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
        <p className="text-sm font-semibold">セットアップ</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          TalentHubを使い始める準備を進めましょう。
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
  const initial = Array.from(name)[0] ?? "ユ";
  const detailsRef = useDismissibleDetails();

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
        aria-label="アカウントメニューを開く"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-sm font-bold text-[var(--primary)]">
          {initial}
        </span>
      </summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl">
        <div className="border-b border-[var(--border)] px-2 py-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{roleLabels[user.role]}</p>
        </div>
        <Link
          href={`/people/${user.memberId}` as Route}
          className="mt-1 flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <Sparkles className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          スキルプロフィール
        </Link>
        <Link
          href="/account/password"
          className="mt-1 flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <KeyRound className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          パスワード変更
        </Link>
        <SignOutButton className="h-11 w-full justify-start px-2" />
      </div>
    </details>
  );
}

function DesktopNavigation({
  groups,
  pathname
}: {
  groups: ReturnType<typeof getNavigationGroupsForRole>;
  pathname: string;
}) {
  return (
    <nav className="flex flex-1 flex-col items-center py-3" aria-label="メインナビゲーション">
      {groups.map((group, index) => (
        <div
          key={group.label}
          className={`grid w-full place-items-center gap-1 px-2 ${index > 0 ? "mt-2 border-t border-[var(--border)] pt-2" : ""}`}
        >
          {group.items.map((item) => (
            <DesktopNavigationLink
              key={item.href}
              item={item}
              active={isSameOrNestedPath(pathname, item.href)}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

function DesktopNavigationLink({
  item,
  active
}: {
  item: AppNavigationItem;
  active: boolean;
}) {
  const Icon = navigationIcons[item.icon];

  return (
    <Tooltip content={item.label} side="right">
      <Link
        href={item.href as Route}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
          active
            ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </Link>
    </Tooltip>
  );
}

function MobileNavigation({
  groups,
  pathname,
  onNavigate
}: {
  groups: ReturnType<typeof getNavigationGroupsForRole>;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto p-3" aria-label="モバイルナビゲーション">
      {groups.map((group, index) => (
        <div
          key={group.label}
          className={index > 0 ? "mt-3 border-t border-[var(--border)] pt-3" : ""}
        >
          <p className="mb-1 px-3 text-xs font-semibold text-[var(--muted-foreground)]">
            {group.label}
          </p>
          <div className="grid gap-1">
            {group.items.map((item) => {
              const Icon = navigationIcons[item.icon];
              const active = isSameOrNestedPath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                    active
                      ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
