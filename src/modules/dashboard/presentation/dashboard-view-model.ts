import { buildDashboardSummary } from "@/modules/dashboard/domain/dashboard-summary";

type DashboardSummary = ReturnType<typeof buildDashboardSummary>;

export function buildDashboardViewModel(summary: DashboardSummary) {
  const signals = [
    {
      id: "members-without-skills",
      label: "スキル未設定メンバー",
      value: summary.membersWithoutSkills,
      unit: "人",
      href: "/members",
      tone: "coral"
    },
    {
      id: "pending-assessments",
      label: "承認待ち申告",
      value: summary.pendingAssessmentsCount,
      unit: "件",
      href: "/skill-approvals",
      tone: "amber"
    },
    {
      id: "unread-notifications",
      label: "未読通知",
      value: summary.unreadNotificationsCount,
      unit: "件",
      href: "/notifications",
      tone: "blue"
    }
  ] as const;

  return {
    roles: summary.roleSummaries.map((role) => ({
      id: role.id,
      name: role.name,
      rate: Math.round(role.achievementRate * 100),
      achievedMembers: role.achievedMembers,
      requiredSkillCount: role.requiredSkillCount
    })),
    categories: [...summary.categorySummaries]
      .sort((left, right) => right.skillCount - left.skillCount)
      .map((category) => ({
        id: category.id,
        name: category.name,
        value: category.skillCount
      })),
    signals
  };
}

export type DashboardViewModel = ReturnType<typeof buildDashboardViewModel>;