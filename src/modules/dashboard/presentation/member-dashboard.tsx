import { Award, CalendarDays, Check, Heart, History, PartyPopper, Radar, Target, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

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

// 成長カレンダーと同じ段に並べるので、高さが揃うよう新しい順に5件までにする
const TIMELINE_LIMIT = 5;

export function MemberDashboard({
  viewModel,
  levelUpFeed
}: {
  viewModel: MemberDashboardViewModel;
  levelUpFeed: SerializableFeedItem[];
}) {
  if (viewModel.onboardingState !== "regular") {
    return (
      <FirstDashboard
        viewModel={viewModel}
        levelUpFeed={levelUpFeed}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`おかえりなさい、${viewModel.memberName}さん`}
        description={viewModel.encouragement}
      />

      {viewModel.approvedSkillCount < 5 || viewModel.targetRole === null ? (
        <section
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4"
          aria-labelledby="recommendations-heading"
        >
          <h2 id="recommendations-heading" className="text-sm font-semibold">おすすめ</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {viewModel.approvedSkillCount < 5 ? (
              <li>
                <Link
                  href="/my/skills"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  スキルをあと {5 - viewModel.approvedSkillCount}件登録すると、得意なことが伝わりやすくなります
                </Link>
              </li>
            ) : null}
            {viewModel.targetRole === null ? (
              <li>
                <Link
                  href="/dashboard#target-role"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  目標ロールを設定すると、必要なスキルとの差が分かります
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

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
              {viewModel.timeline.slice(0, TIMELINE_LIMIT).map((item) => (
                <li key={item.id} className="relative py-4 pl-7">
                  <span className="absolute left-0 top-5 h-3 w-3 rounded-full bg-[var(--primary)] ring-4 ring-[var(--primary-subtle)]" aria-hidden="true" />
                  <p className="text-sm font-semibold">
                    {formatShortDate(item.changedAt)} {item.skillName}{" "}
                    {item.fromLevel === null
                      ? `未登録 → Lv${item.toLevel}`
                      : `Lv${item.fromLevel} → Lv${item.toLevel}`}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.categoryName}</p>
                </li>
              ))}
            </ol>
          ) : null}
          {viewModel.timeline.length > TIMELINE_LIMIT ? (
            <div className="border-t border-[var(--border)] px-5 py-3 text-right">
              <Link
                href="/my/skills?tab=history"
                className="text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                すべて見る
              </Link>
            </div>
          ) : null}
          {viewModel.timeline.length === 0 ? (
            <EmptyState
              icon={History}
              title="成長の記録はまだありません"
              description="スキルを申請すると、承認後の変化がここに残ります。"
            />
          ) : null}
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

function FirstDashboard({
  viewModel,
  levelUpFeed
}: {
  viewModel: MemberDashboardViewModel;
  levelUpFeed: SerializableFeedItem[];
}) {
  const waiting = viewModel.onboardingState === "pending";

  return (
    <div className="space-y-5">
      <PageHeader
        title={`ようこそ、${viewModel.memberName}さん`}
        description="得意なスキルを登録すると、上司に届き、承認されるとここに成長が記録されます。"
      />
      <section
        id="first-steps"
        className="scroll-mt-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        aria-labelledby="first-steps-heading"
      >
        <h2 id="first-steps-heading" className="text-lg font-semibold">
          はじめの3ステップ
        </h2>
        <ol className="mt-4 space-y-3">
          <FirstStep completed number={1} title="パスワードを決める" />
          <FirstStep
            completed={waiting}
            current={!waiting}
            number={2}
            title="得意なスキルを申請する"
            description="3つほど選ぶと1分ほどで終わります。あとから増やせます。"
            action={!waiting ? (
              <Link
                href="/my/skills"
                className="inline-flex min-h-11 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white"
              >
                スキルを選ぶ
              </Link>
            ) : undefined}
          />
          <FirstStep
            current={waiting}
            number={3}
            title={waiting ? "上司の承認を待っています" : "上司の承認を待つ"}
            description={waiting
              ? `${viewModel.managerName ? `${viewModel.managerName}さん` : "上司"}に ${viewModel.pendingAssessmentCount}件届いています。承認されるとお知らせが届きます。`
              : viewModel.managerName
                ? `承認されるとお知らせが届きます（上司：${viewModel.managerName}）`
                : "承認されるとお知らせが届きます。"}
            tag={waiting ? `承認待ち ${viewModel.pendingAssessmentCount}件` : undefined}
          />
        </ol>
        {waiting ? (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            待っている間に：
            <Link
              href="/explore"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              得意な人を探す
            </Link>
            <span aria-hidden="true">・</span>
            <Link
              href="/dashboard#target-role"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              目標ロールを設定する
            </Link>
          </p>
        ) : null}
      </section>
      {waiting ? <TargetRoleCard viewModel={viewModel} /> : null}
      <section
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        aria-labelledby="first-dashboard-preview-heading"
      >
        <h2 id="first-dashboard-preview-heading" className="text-base font-semibold">
          スキルが承認されると、ここに表示されます
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <PreviewCard icon={CalendarDays} text="成長の記録とカレンダー" />
          <PreviewCard icon={Award} text="達成バッジ" />
          <PreviewCard icon={Target} text="目標ロールまでの進み具合（目標ロールはあとで設定できます）" />
        </div>
      </section>
      {levelUpFeed.length > 0 ? (
        <section
          className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          aria-labelledby="department-level-ups-heading"
        >
          <div className="p-5">
            <SectionHeading
              id="department-level-ups-heading"
              icon={PartyPopper}
              title="チームのレベルアップ"
            />
          </div>
          <div className="border-t border-[var(--border)]">
            <LevelUpFeed
              items={levelUpFeed}
              viewer={{
                memberId: viewModel.memberId,
                memberName: viewModel.memberName
              }}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FirstStep({
  completed = false,
  current = false,
  number,
  title,
  description,
  action,
  tag
}: {
  completed?: boolean;
  current?: boolean;
  number: number;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tag?: string;
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${current ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--border)]"}`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${completed ? "bg-[var(--primary)] text-white" : "border-2 border-[var(--border-strong)]"}`}
      >
        {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {title}
          {completed ? (
            <span className="ml-2 text-xs text-[var(--primary)]">完了</span>
          ) : null}
        </p>
        {description ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      {tag ? (
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          {tag}
        </span>
      ) : null}
      {action}
    </li>
  );
}

function PreviewCard({ icon: Icon, text }: { icon: typeof Award; text: string }) {
  return (
    <div className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--muted-foreground)]">
      <Icon className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
      {text}
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
