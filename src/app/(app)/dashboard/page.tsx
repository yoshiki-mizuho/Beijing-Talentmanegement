import { Bell, ClipboardCheck, Sparkles, Users } from "lucide-react";

import { getDashboardSummary } from "@/modules/dashboard/application/dashboard-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const metrics = [
    {
      label: "メンバー",
      value: summary.memberCount,
      caption: `スキル未設定 ${summary.membersWithoutSkills}人`,
      icon: Users
    },
    {
      label: "スキル",
      value: summary.skillCount,
      caption: `有効 ${summary.activeSkillsCount}件`,
      icon: Sparkles
    },
    {
      label: "承認待ち",
      value: summary.pendingAssessmentsCount,
      caption: "スキル申告レビュー",
      icon: ClipboardCheck
    },
    {
      label: "未読通知",
      value: summary.unreadNotificationsCount,
      caption: "全体の未読件数",
      icon: Bell
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          ダッシュボード
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          メンバー、スキル、申告、ロール達成状況をDB集計で確認します。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-cyan-800">
                {metric.value}
              </p>
              <p className="mt-1 text-sm text-slate-600">{metric.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>ロール達成状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.roleSummaries.length === 0 ? (
              <p className="text-sm text-slate-600">有効なロールがありません。</p>
            ) : (
              summary.roleSummaries.map((role) => (
                <div key={role.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-950">{role.name}</p>
                      <p className="text-sm text-slate-600">
                        必要スキル {role.requiredSkillCount}件
                      </p>
                    </div>
                    <span className="rounded-md bg-cyan-50 px-2 py-1 text-sm font-medium text-cyan-800">
                      {role.achievedMembers}人 / {Math.round(role.achievementRate * 100)}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-cyan-700"
                      style={{ width: `${Math.round(role.achievementRate * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別スキル数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.categorySummaries.length === 0 ? (
              <p className="text-sm text-slate-600">カテゴリがありません。</p>
            ) : (
              summary.categorySummaries.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {category.name}
                  </span>
                  <span className="text-sm text-slate-600">
                    {category.skillCount}件
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
