import { Award, CalendarDays, Heart, History, PartyPopper, Radar, Users } from "lucide-react";
import type { Route } from "next";

import { DashboardSectionHeading as SectionHeading } from "@/modules/dashboard/presentation/dashboard-section-heading";
import type { MemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";
import { BadgeGrid } from "@/modules/growth/presentation/badge-grid";
import { GrowthCalendar } from "@/modules/growth/presentation/growth-calendar";
import { GrowthRadarChart } from "@/modules/growth/presentation/growth-radar-chart";
import { LevelUpFeed, type SerializableFeedItem } from "@/modules/growth/presentation/level-up-feed";
import { TargetRoleCard } from "@/modules/growth/presentation/target-role-card";
import { EmptyState } from "@/shared/ui/empty-state";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { PageHeader } from "@/shared/ui/page-header";

export function MemberDashboard({
  viewModel,
  levelUpFeed
}: {
  viewModel: MemberDashboardViewModel;
  levelUpFeed: SerializableFeedItem[];
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        title={`おかえりなさい、${viewModel.memberName}さん`}
        description={viewModel.encouragement}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <TargetRoleCard viewModel={viewModel} />
        <DashboardCard
          id="badges-heading"
          icon={Award}
          title="達成バッジ"
          description="これまでの成長の節目を振り返れます。"
        >
          <BadgeGrid badges={viewModel.badges} />
        </DashboardCard>
        <DashboardCard
          id="radar-heading"
          icon={Radar}
          title="カテゴリ別スキル"
          description="保有スキルの平均レベルです。"
        >
          <GrowthRadarChart values={viewModel.radar} />
        </DashboardCard>
      </div>

      {viewModel.cheers.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="cheers-heading">
          <div className="p-5"><SectionHeading id="cheers-heading" icon={Heart} title="応援が届いています" /></div>
          <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)] px-5">
            {viewModel.cheers.map((cheer) => (
              <li key={cheer.id} className="flex gap-3 py-4">
                <MemberAvatar
                  memberId={cheer.senderId}
                  name={cheer.senderName}
                  avatarUpdatedAt={cheer.senderAvatarUpdatedAt}
                  href={`/people/${cheer.senderId}` as Route}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{cheer.senderName}さんが応援しています</p>
                    <time className="text-xs text-[var(--muted-foreground)]">{formatShortDate(cheer.createdAt)}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{cheer.message}</p>
                  {cheer.mentor ? (
                    <p className="mt-2 text-xs font-medium text-[var(--primary)]">
                      {cheer.mentor.name}さん（{cheer.mentor.skillName} Lv
                      {cheer.mentor.level ?? "-"}）に相談してみよう
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <DashboardCard
          id="calendar-heading"
          icon={CalendarDays}
          title="成長カレンダー"
          description="申請とレベルアップの日を振り返れます。"
        >
          <GrowthCalendar calendar={viewModel.calendar} />
        </DashboardCard>
        <section id="growth-timeline" className="scroll-mt-20 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="timeline-heading">
          <div className="p-5"><SectionHeading id="timeline-heading" icon={History} title="成長の記録" description="最近のスキル変化を新しい順に表示します。" /></div>
          {viewModel.timeline.length > 0 ? (
            <ol className="divide-y divide-[var(--border)] border-t border-[var(--border)] px-5">
              {viewModel.timeline.map((item) => (
                <li key={item.id} className="relative py-4 pl-7">
                  <span className="absolute left-0 top-5 h-3 w-3 rounded-full bg-[var(--primary)] ring-4 ring-[var(--primary-subtle)]" aria-hidden="true" />
                  <p className="text-sm font-semibold">
                    {formatShortDate(item.changedAt)} {item.skillName}{" "}
                    {item.fromLevel === null
                      ? `新規 Lv${item.toLevel}`
                      : `Lv${item.fromLevel} → Lv${item.toLevel}`}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.categoryName}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={History}
              title="成長の記録はまだありません"
              description="スキルを申請すると、承認後の変化がここに残ります。"
            />
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="department-level-ups-heading">
          <div className="p-5">
            <SectionHeading
              id="department-level-ups-heading"
              icon={PartyPopper}
              title="チームのレベルアップ"
              description="同じ部署の仲間の、最近の成長をお祝いできます。"
            />
          </div>
          <div className="border-t border-[var(--border)]">
            <LevelUpFeed
              items={levelUpFeed}
              viewer={{ memberId: viewModel.memberId, memberName: viewModel.memberName }}
            />
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="mentors-heading">
          <div className="p-5"><SectionHeading id="mentors-heading" icon={Users} title="教えてもらえそうな人" description={viewModel.targetRole ? "目標ロールの未達スキルを得意とする人です。" : "今の保有スキルのうち、低いレベルから伸ばせそうな相手です。"} /></div>
          {viewModel.mentors.length > 0 ? (
            <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)] px-5">
              {viewModel.mentors.map((mentor) => (
                <li key={`${mentor.memberId}-${mentor.skillId}`} className="flex items-center gap-3 py-4">
                  <MemberAvatar
                    memberId={mentor.memberId}
                    name={mentor.name}
                    avatarUpdatedAt={mentor.avatarUpdatedAt}
                    href={`/people/${mentor.memberId}` as Route}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{mentor.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{mentor.skillName} Lv{mentor.level}{mentor.jobTitle ? `・${mentor.jobTitle}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Users}
              title="候補はまだ見つかりません"
              description="目標や保有スキルが増えると、相談できそうな人を表示します。"
            />
          )}
        </section>
      </div>
    </div>
  );
}

function DashboardCard({
  id,
  icon,
  title,
  description,
  children
}: {
  id: string;
  icon: typeof Award;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 xl:p-4"
      aria-labelledby={id}
    >
      <SectionHeading id={id} icon={icon} title={title} description={description} />
      <div className="mt-3">{children}</div>
    </section>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
