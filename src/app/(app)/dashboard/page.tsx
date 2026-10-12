import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { getDashboardSummary } from "@/modules/dashboard/application/dashboard-service";
import { getMemberDashboard } from "@/modules/dashboard/application/member-dashboard-service";
import { getTeamDashboard } from "@/modules/dashboard/application/team-dashboard-service";
import { DashboardVisualizations } from "@/modules/dashboard/presentation/dashboard-visualizations";
import { MemberDashboard } from "@/modules/dashboard/presentation/member-dashboard";
import { buildMemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";
import { TeamDashboard } from "@/modules/dashboard/presentation/team-dashboard";
import { buildTeamDashboardViewModel } from "@/modules/dashboard/presentation/team-dashboard-view-model";
import { getDepartmentLevelUpFeed } from "@/modules/growth/application/growth-service";
import { listDepartments } from "@/modules/members/application/member-service";
import { getCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
type DashboardView = "personal" | "team" | "organization";

function DashboardViewSwitch({ current }: { current: DashboardView }) {
  const items: { view: DashboardView; label: string; href: Route }[] = [
    {
      view: "personal",
      label: "個人",
      href: "/dashboard?view=personal" as Route,
    },
    { view: "team", label: "チーム", href: "/dashboard?view=team" as Route },
    {
      view: "organization",
      label: "組織",
      href: "/dashboard?view=organization" as Route,
    },
  ];
  return (
    <nav aria-label="ダッシュボードの表示切り替え" className="flex justify-end">
      <div className="inline-flex gap-1 rounded-xl bg-[var(--muted)] p-1">
        {items.map((item) => (
          <Link
            key={item.view}
            href={item.href}
            aria-current={item.view === current ? "page" : undefined}
            className={`inline-flex h-11 items-center rounded-lg px-4 text-sm ${item.view === current ? "bg-white font-semibold shadow-sm" : "text-[var(--muted-foreground)]"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; department?: string }>;
}) {
  const session = await getCurrentSession();
  const { view, month, department } = await searchParams;
  const management =
    session?.user.role === "ADMIN" || session?.user.role === "MANAGER";
  const personal =
    Boolean(session?.user.memberId) && (!management || view === "personal");
  if (session?.user.memberId && personal) {
    const [data, feed] = await Promise.all([
      getMemberDashboard(session.user.memberId),
      getDepartmentLevelUpFeed(session.user.memberId, 5),
    ]);
    const model = buildMemberDashboardViewModel(data);
    if (!model) redirect("/login");
    return (
      <div className="space-y-4">
        {management ? <DashboardViewSwitch current="personal" /> : null}
        <MemberDashboard
          viewModel={model}
          levelUpFeed={feed.map((item) => ({
            ...item,
            avatarUpdatedAt: item.avatarUpdatedAt?.toISOString() ?? null,
            changedAt: item.changedAt.toISOString(),
            comments: item.comments.map((comment) => ({
              ...comment,
              createdAt: comment.createdAt.toISOString(),
            })),
          }))}
        />
      </div>
    );
  }
  if (session?.user.memberId && management && view !== "organization") {
    const team = await getTeamDashboard(session.user.memberId, month);
    if (!team) redirect("/login");
    if (view === "team" || team.members.length > 0)
      return (
        <div className="space-y-4">
          <DashboardViewSwitch current="team" />
          <TeamDashboard viewModel={buildTeamDashboardViewModel(team)} />
        </div>
      );
  }
  if (!session?.user.memberId || !management) redirect("/login");
  const [{ scope, summary }, departments] = await Promise.all([
    getDashboardSummary(session.user.role, session.user.memberId, department),
    session.user.role === "ADMIN" ? listDepartments() : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-5">
      <DashboardViewSwitch current="organization" />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold">組織の成長</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {scope.name}・{summary.memberCount}名
          </p>
        </div>
        <span className="text-sm font-semibold">直近6か月</span>
      </header>
      {session.user.role === "ADMIN" ? (
        <nav aria-label="組織の範囲" className="flex flex-wrap gap-2">
          <Link
            href="/dashboard?view=organization"
            className={chip(!scope.departmentId)}
          >
            全社
          </Link>
          {departments.map((item) => (
            <Link
              key={item.id}
              href={
                `/dashboard?view=organization&department=${item.id}` as Route
              }
              className={chip(scope.departmentId === item.id)}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}
      <DashboardVisualizations
        summary={summary}
        showDepartments={session.user.role === "ADMIN" && !scope.departmentId}
      />
    </div>
  );
}

function chip(active: boolean) {
  return `inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold ${active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`;
}
