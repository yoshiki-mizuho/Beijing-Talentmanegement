import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Gauge,
  Target
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { MemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { Metric } from "@/shared/ui/metric";
import { PageHeader } from "@/shared/ui/page-header";

export function MemberDashboard({
  viewModel
}: {
  viewModel: MemberDashboardViewModel;
}) {
  const metrics = [
    { label: "承認済みスキル", value: viewModel.skillCount, caption: "現在プロフィールに登録されている件数", icon: BookOpenCheck, tone: "teal" as const },
    { label: "平均スキルレベル", value: viewModel.averageLevel, caption: "承認済みスキルの単純平均", icon: Gauge, tone: "green" as const },
    { label: "承認待ち", value: viewModel.pendingAssessmentCount, caption: "現在レビュー中のスキル申告", icon: Clock3, tone: "amber" as const },
    { label: "未読通知", value: viewModel.unreadNotificationCount, caption: "確認が必要な最新のお知らせ", icon: Bell, tone: "coral" as const }
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Growth" title={`${viewModel.memberName}さんのダッシュボード`} description="現在のスキルと目標との差を確認し、次に取り組むことを整理できます。" />

      <section aria-labelledby="member-overview-heading">
        <h2 id="member-overview-heading" className="sr-only">自分のスキル概要</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">目標ロールとのギャップ</h2>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">現在のスキルに最も近いロールを候補として表示しています。</p>
            </div>
            <Target className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
          </div>
          {viewModel.targetRole ? (
            <div className="space-y-5 p-5">
              <div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">目標候補</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{viewModel.targetRole.name}</p>
                  </div>
                  <Badge variant={viewModel.targetRole.achieved ? "success" : "primary"}>充足率 {viewModel.targetRole.achievementRate}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${viewModel.targetRole.name}の必須スキル充足率 ${viewModel.targetRole.achievementRate}%`}>
                  <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${viewModel.targetRole.achievementRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">必須スキル {viewModel.targetRole.requiredSkillCount}件中{viewModel.targetRole.satisfiedSkillCount}件を充足</p>
              </div>
              {viewModel.targetRole.gaps.length > 0 ? (
                <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {viewModel.targetRole.gaps.slice(0, 5).map((gap) => (
                    <div key={gap.skillId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{gap.skillName}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{gap.categoryName}</p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--foreground)]">{gap.currentLevel === null ? "未設定" : `Lv.${gap.currentLevel}`} → Lv.{gap.requiredLevel}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />このロールの必須スキルを満たしています。</div>
              )}
            </div>
          ) : (
            <EmptyState icon={Target} title="目標ロールを算出できません" description="必須スキルが設定されたロールが登録されると、現在地とのギャップを表示します。" />
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">現在のスキル</h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">承認済みスキルをレベル順に表示しています。</p>
          </div>
          {viewModel.skills.length > 0 ? (
            <div className="divide-y divide-[var(--border)] px-5">
              {viewModel.skills.slice(0, 6).map((skill) => (
                <div key={skill.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-[var(--foreground)]">{skill.name}</p><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{skill.categoryName}</p></div>
                    <Badge variant="neutral">Lv.{skill.level}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((level) => <span key={level} className={`h-1.5 rounded-full ${level <= skill.level ? "bg-[var(--primary)]" : "bg-[var(--surface-subtle)]"}`} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpenCheck} title="承認済みスキルはまだありません" description="自分のスキル画面から、最初のスキルを申告してください。" />
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-sm font-semibold text-[var(--foreground)]">次のアクション</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">現在の登録・申告状況に基づく確認項目です。</p></div>
        {viewModel.actions.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {viewModel.actions.map((action) => (
              <Link key={action.id} href={action.href as Route} className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]">
                <span className="min-w-0"><span className="block text-sm font-medium text-[var(--foreground)]">{action.title}</span><span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{action.description}</span></span>
                <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-28 items-center gap-3 px-5 py-4 text-sm text-[var(--muted-foreground)]"><CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />現在、確認が必要な項目はありません。</div>
        )}
      </section>
    </div>
  );
}
