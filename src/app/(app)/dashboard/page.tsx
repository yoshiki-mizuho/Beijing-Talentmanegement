import {
  ArrowUpRight,
  Bell,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { getDashboardSummary } from "@/modules/dashboard/application/dashboard-service";
import { getMemberDashboard } from "@/modules/dashboard/application/member-dashboard-service";
import { getTeamDashboard } from "@/modules/dashboard/application/team-dashboard-service";
import { DashboardVisualizations } from "@/modules/dashboard/presentation/dashboard-visualizations";
import { buildDashboardViewModel } from "@/modules/dashboard/presentation/dashboard-view-model";
import { MemberDashboard } from "@/modules/dashboard/presentation/member-dashboard";
import { buildMemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";
import { TeamDashboard } from "@/modules/dashboard/presentation/team-dashboard";
import { buildTeamDashboardViewModel } from "@/modules/dashboard/presentation/team-dashboard-view-model";
import { getDepartmentLevelUpFeed } from "@/modules/growth/application/growth-service";
import { getCurrentSession } from "@/server/auth/session";
import { Badge } from "@/shared/ui/badge";
import { Metric } from "@/shared/ui/metric";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

const signalIcons = {
  "members-without-skills": CircleAlert,
  "pending-assessments": Clock3,
  "unread-notifications": Bell
} as const;

const signalTones = {
  coral: "bg-red-50 text-[var(--accent-coral)]",
  amber: "bg-amber-50 text-amber-800",
  blue: "bg-sky-50 text-[var(--accent-blue)]"
} as const;

type DashboardView = "personal" | "team" | "organization";

function DashboardViewSwitch({ current }: { current: DashboardView }) {
  const items: { view: DashboardView; label: string; href: Route }[] = [
    { view: "personal", label: "個人", href: "/dashboard?view=personal" as Route },
    { view: "team", label: "チーム", href: "/dashboard?view=team" as Route },
    { view: "organization", label: "組織", href: "/dashboard?view=organization" as Route }
  ];

  return (
    <nav aria-label="ダッシュボードの表示切り替え" className="flex justify-end">
      <div className="inline-flex gap-1 rounded-xl bg-[var(--muted)] p-1">
        {items.map((item) => (
          <Link
            key={item.view}
            href={item.href}
            aria-current={item.view === current ? "page" : undefined}
            className={`inline-flex h-11 items-center rounded-lg px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              item.view === current
                ? "bg-[var(--surface)] font-semibold text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const session = await getCurrentSession();
  const { view, month } = await searchParams;
  const isManagementRole =
    session?.user.role === "ADMIN" || session?.user.role === "MANAGER";
  const showPersonal = Boolean(session?.user.memberId) && (!isManagementRole || view === "personal");

  if (session?.user.memberId && showPersonal) {
    const [memberDashboard, departmentFeed] = await Promise.all([
      getMemberDashboard(session.user.memberId),
      getDepartmentLevelUpFeed(session.user.memberId, 5)
    ]);
    const memberViewModel = buildMemberDashboardViewModel(memberDashboard);

    if (!memberViewModel) {
      redirect("/login");
    }

    return isManagementRole ? (
      <div className="space-y-4">
        <DashboardViewSwitch current="personal" />
        <MemberDashboard
          viewModel={memberViewModel}
          levelUpFeed={serializeFeed(departmentFeed)}
        />
      </div>
    ) : (
      <MemberDashboard
        viewModel={memberViewModel}
        levelUpFeed={serializeFeed(departmentFeed)}
      />
    );
  }

  if (session?.user.memberId && isManagementRole && view !== "organization") {
    const teamDashboard = await getTeamDashboard(session.user.memberId, month);
    if (!teamDashboard) redirect("/login");

    if (view === "team" || teamDashboard.members.length > 0) {
      return (
        <div className="space-y-4">
          <DashboardViewSwitch current="team" />
          <TeamDashboard viewModel={buildTeamDashboardViewModel(teamDashboard)} />
        </div>
      );
    }
  }

  const summary = await getDashboardSummary();
  const viewModel = buildDashboardViewModel(summary);
  const metrics = [
    {
      label: "メンバー",
      value: summary.memberCount,
      caption: `スキル設定済み ${summary.memberCount - summary.membersWithoutSkills}人`,
      icon: Users,
      tone: "teal" as const
    },
    {
      label: "スキル",
      value: summary.skillCount,
      caption: `有効スキル ${summary.activeSkillsCount}件`,
      icon: Sparkles,
      tone: "green" as const
    },
    {
      label: "承認待ち",
      value: summary.pendingAssessmentsCount,
      caption: "レビューが必要な申告",
      icon: ClipboardCheck,
      tone: "amber" as const
    },
    {
      label: "未読通知",
      value: summary.unreadNotificationsCount,
      caption: "確認が必要な通知",
      icon: Bell,
      tone: "coral" as const
    }
  ];

  return (
    <div className="space-y-6">
      {session?.user.memberId ? <DashboardViewSwitch current="organization" /> : null}
      <PageHeader
        title="ダッシュボード"
        description="人材とスキルの現在地を、登録データに基づいて俯瞰します。"
      />

      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="sr-only">全体指標</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Metric key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <DashboardVisualizations roles={viewModel.roles} categories={viewModel.categories} />

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">要対応シグナル</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              データ品質と日常業務で確認が必要な項目
            </p>
          </div>
          <Badge variant={viewModel.signals.every((signal) => signal.value === 0) ? "success" : "warning"}>
            {viewModel.signals.filter((signal) => signal.value > 0).length}項目に対応
          </Badge>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {viewModel.signals.map((signal) => {
            const Icon = signalIcons[signal.id];
            return (
              <Link
                key={signal.id}
                href={signal.href as Route}
                className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
              >
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${signalTones[signal.tone]}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--foreground)]">{signal.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                    {signal.value === 0 ? "現在、対応は不要です" : "詳細を確認してください"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {signal.value}{signal.unit}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function serializeFeed(
  items: Awaited<ReturnType<typeof getDepartmentLevelUpFeed>>
) {
  return items.map((item) => ({
    ...item,
    changedAt: item.changedAt.toISOString(),
    comments: item.comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString()
    }))
  }));
}
