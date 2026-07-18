"use client";

import {
  BarChart3,
  Bell,
  ClipboardCheck,
  FileSpreadsheet,
  Library,
  Map,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { SignOutButton } from "@/modules/auth/presentation/sign-out-button";
import {
  getNavigationGroupsForRole,
  isSameOrNestedPath,
  type AppNavigationItem,
  type AppRole
} from "@/shared/auth/app-access";
import { Badge } from "@/shared/ui/badge";
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
  auditLogs: ShieldCheck
} satisfies Record<AppNavigationItem["icon"], LucideIcon>;

const roleLabels: Record<string, string> = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  MEMBER: "メンバー"
};

export function AppShell({
  user,
  children
}: {
  user: { name?: string | null; role: AppRole };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationGroups = getNavigationGroupsForRole(user.role);
  const items = navigationGroups.flatMap((group) => group.items);
  const activeItem = items.find((item) => isSameOrNestedPath(pathname, item.href));


  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] lg:sticky lg:top-0 lg:flex">
        <Brand />
        <Navigation groups={navigationGroups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{user.name ?? "ユーザー"}</p>
          <p className="mt-1 text-xs text-[var(--sidebar-muted)]">
            {roleLabels[user.role] ?? user.role}
          </p>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="ナビゲーションを閉じる"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="relative flex h-full w-[min(320px,86vw)] flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pr-3">
              <Brand />
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--sidebar-muted)] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={() => setMobileOpen(false)}
                aria-label="ナビゲーションを閉じる"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <Navigation groups={navigationGroups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Tooltip content="ナビゲーション">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="ナビゲーションを開く"
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </Tooltip>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {activeItem?.label ?? "Talent Management"}
              </p>
              <p className="hidden text-xs text-[var(--muted-foreground)] sm:block">
                People Intelligence Workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="通知">
              <Link
                href="/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label="通知を開く"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Tooltip>
            <Badge className="hidden sm:inline-flex" variant="primary">
              {roleLabels[user.role] ?? user.role}
            </Badge>
            <SignOutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex h-16 items-center gap-3 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-teal-400 text-[var(--sidebar)]">
        <BarChart3 className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">Talent Management</span>
        <span className="block text-xs text-[var(--sidebar-muted)]">People Intelligence</span>
      </span>
    </Link>
  );
}

function Navigation({
  groups,
  pathname,
  onNavigate
}: {
  groups: ReturnType<typeof getNavigationGroupsForRole>;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="メインナビゲーション">
      {groups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase text-[var(--sidebar-muted)]">
            {group.label}
          </p>
          <div className="grid gap-1">
            {group.items.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                active={isSameOrNestedPath(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavigationLink({
  item,
  active,
  onNavigate
}: {
  item: AppNavigationItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = navigationIcons[item.icon];
  return (
    <Link
      href={item.href as Route}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        active
          ? "bg-white/12 text-white"
          : "text-[var(--sidebar-muted)] hover:bg-white/7 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {active ? (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-300" aria-hidden="true" />
      ) : null}
    </Link>
  );
}
