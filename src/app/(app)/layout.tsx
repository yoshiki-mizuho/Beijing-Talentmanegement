import {
  BarChart3,
  Bell,
  ClipboardCheck,
  FileSpreadsheet,
  Map,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Route } from "next";
import type { ReactNode } from "react";

import { SignOutButton } from "@/modules/auth/presentation/sign-out-button";
import { getCurrentSession } from "@/server/auth/session";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: BarChart3 },
  { href: "/members", label: "メンバー", icon: Users },
  { href: "/my/skills", label: "自分のスキル", icon: Sparkles },
  { href: "/skill-approvals", label: "スキル承認", icon: ClipboardCheck },
  { href: "/skills", label: "スキル管理", icon: Sparkles },
  { href: "/roles", label: "ロール管理", icon: ClipboardCheck },
  { href: "/skill-map", label: "スキルマップ", icon: Map },
  { href: "/csv", label: "CSV", icon: FileSpreadsheet },
  { href: "/audit-logs", label: "監査ログ", icon: ShieldCheck }
] as const;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const requestPath = (await headers()).get("x-pathname") ?? "";

  if (session.user.passwordChangeRequired && requestPath !== "/account/password") {
    redirect("/account/password" as Route);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/dashboard" className="font-semibold">
            Talent Management
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{session.user?.name}</p>
              <p className="text-slate-500">{session.user.role}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3 lg:min-h-[calc(100vh-7rem)]">
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/notifications"
              className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              通知
            </Link>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
