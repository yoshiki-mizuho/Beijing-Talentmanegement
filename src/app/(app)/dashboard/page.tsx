import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { getDashboardSummary } from "@/modules/dashboard/application/dashboard-service";
import { getMemberDashboard, getMemberSkillReminders } from "@/modules/dashboard/application/member-dashboard-service";
import { getTeamDashboard } from "@/modules/dashboard/application/team-dashboard-service";
import { OrganizationDashboard } from "@/modules/dashboard/presentation/organization-dashboard";
import { MemberDashboard } from "@/modules/dashboard/presentation/member-dashboard";
import { buildMemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";
import { TeamDashboard } from "@/modules/dashboard/presentation/team-dashboard";
import { buildTeamDashboardViewModel } from "@/modules/dashboard/presentation/team-dashboard-view-model";
import { getDepartmentLevelUpFeed } from "@/modules/growth/application/growth-service";
import { getMonthlyRecap } from "@/modules/growth/application/monthly-recap-service";
import { getManagerTeamGoal, getMemberTeamGoal } from "@/modules/team-goals/application/team-goal-service";
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
    const [data, feed, skillReminders, monthlyRecap, teamGoal] = await Promise.all([
      getMemberDashboard(session.user.memberId),
      getDepartmentLevelUpFeed(session.user.memberId, 5),
      getMemberSkillReminders(session.user.memberId),
      getMonthlyRecap(session.user.memberId),
      getMemberTeamGoal(session.user.memberId)
    ]);
    const model = buildMemberDashboardViewModel(data);
    if (!model) redirect("/login");
    return (
      <div className="space-y-4">
        {management ? <DashboardViewSwitch current="personal" /> : null}
        <MemberDashboard
          viewModel={model}
          skillReminders={skillReminders}
          monthlyRecap={monthlyRecap?.months.length ? monthlyRecap.recap : null}
          teamGoal={teamGoal}
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
    const [team, teamGoal] = await Promise.all([
      getTeamDashboard(session.user.memberId, month),
      getManagerTeamGoal(session.user.memberId)
    ]);
    if (!team) redirect("/login");
    if (view === "team" || team.members.length > 0)
      return (
        <div className="space-y-4">
          <DashboardViewSwitch current="team" />
          <TeamDashboard viewModel={buildTeamDashboardViewModel(team)} teamGoal={teamGoal} />
        </div>
      );
  }
  if (!session?.user.memberId || !management) redirect("/login");
  const organization = await getDashboardSummary(session.user.role, session.user.memberId, department);
  return (
    <div className="space-y-5">
      <DashboardViewSwitch current="organization" />
      <OrganizationDashboard model={organization} />
    </div>
  );
}
