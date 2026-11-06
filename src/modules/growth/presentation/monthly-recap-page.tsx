import { Award, ChevronLeft, ChevronRight, Heart, MessageCircle, PartyPopper, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import type { getMonthlyRecap } from "@/modules/growth/application/monthly-recap-service";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";

type Result = NonNullable<Awaited<ReturnType<typeof getMonthlyRecap>>>;

export function MonthlyRecapPage({ result }: { result: Result }) {
  const { recap, months } = result;
  if (months.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="振り返り" />
        <RecapCard>
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            来月から振り返りが見られます。
          </p>
        </RecapCard>
      </div>
    );
  }
  const index = months.indexOf(recap.month);
  const historyMax = Math.max(1, ...recap.history.map((entry) => entry.count));
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="振り返り" />
        <nav aria-label="振り返る月" className="flex items-center justify-center gap-2">
          <MonthLink month={months[index - 1]} direction="previous" />
          <span className="min-w-32 text-center font-semibold">{formatMonth(recap.month)}</span>
          <MonthLink month={months[index + 1]} direction="next" />
        </nav>
      </div>
      <section className="rounded-2xl border border-teal-200 bg-[#E6F4F1] p-5">
        <p className="text-sm font-semibold text-[var(--primary)]">
          {Number(recap.month.slice(5))}月のあなた
        </p>
        <p className="mt-1 text-lg font-bold">{recap.encouragement}</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="レベルアップ" value={recap.levelUpCount} detail={recap.levelUpDifferenceLabel} />
        <Metric label="新しく登録したスキル" value={recap.newSkillCount} />
        <Metric label="申請" value={recap.assessmentCount} detail={`承認 ${recap.assessmentCounts.approved}・差し戻し ${recap.assessmentCounts.rejected}・承認待ち ${recap.assessmentCounts.pending}`} />
        <Metric label="届いた声" value={recap.voiceCount} detail={`応援 ${recap.voiceCounts.cheers}・リアクション ${recap.voiceCounts.reactions}・コメント ${recap.voiceCounts.comments}`} />
      </div>
      <RecapCard>
        <h2 className="text-sm font-semibold">12か月のレベルアップ</h2>
        <div className="mt-4 flex h-32 items-end gap-1 sm:gap-2" role="img" aria-label={recap.history.map((item) => `${Number(item.month.slice(5))}月は${item.count}回`).join("、")}>
          {recap.history.map((item) => (
            <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px]">{item.count}</span>
              <span className={`w-full rounded-t ${item.month === recap.month ? "bg-[var(--primary)]" : item.count === 0 ? "bg-[var(--muted)]" : "bg-teal-200"}`} style={{ height: `${Math.max(4, item.count / historyMax * 80)}px` }} />
              <span className="text-[10px] text-[var(--muted-foreground)]">{Number(item.month.slice(5))}月</span>
            </div>
          ))}
        </div>
      </RecapCard>
      <div className="grid gap-5 lg:grid-cols-2">
        <RecapCard>
          <h2 className="flex items-center gap-2 font-semibold">
            <PartyPopper className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
            レベルアップしたスキル
          </h2>
          {recap.levelUps.length === 0 ? <Empty>この月のレベルアップはありません。</Empty> : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {recap.levelUps.map((item) => (
                <li key={item.id}>
                  <Link href={`/level-ups/${item.id}` as Route} className="flex min-h-14 items-center justify-between gap-3 py-3 hover:text-[var(--primary)]">
                    <span>
                      <strong className="block text-sm">{item.skillName}</strong>
                      <span className="text-xs text-[var(--muted-foreground)]">{item.fromLevel === null ? "未登録" : `Lv${item.fromLevel}`} → Lv{item.toLevel}・{formatDate(item.changedAt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs" aria-label={`リアクション ${item.reactionCount}件、コメント ${item.commentCount}件`}>
                      <span className="inline-flex items-center gap-1" aria-hidden="true">
                        <Heart className="h-4 w-4" />
                        {item.reactionCount}
                      </span>
                      <span className="inline-flex items-center gap-1" aria-hidden="true">
                        <MessageCircle className="h-4 w-4" />
                        {item.commentCount}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </RecapCard>
        <div className="space-y-5">
          {recap.roleProgress ? (
            <RecapCard>
              <h2 className="font-semibold">目標ロール：{recap.roleProgress.roleName}</h2>
              <p className="mt-3 text-sm">{recap.roleProgress.startPercentage}% → {recap.roleProgress.endPercentage}%（あと{recap.roleProgress.missingCount}スキル）</p>
              <Progress startValue={recap.roleProgress.startPercentage} endValue={recap.roleProgress.endPercentage} />
            </RecapCard>
          ) : null}
          <RecapCard>
            <h2 className="flex items-center gap-2 font-semibold">
              <Award className="h-5 w-5 text-amber-600" aria-hidden="true" />
              新しいバッジ
            </h2>
            {recap.badges.length ? (
              <ul className="mt-3 space-y-2">
                {recap.badges.map((badge) => (
                  <li key={badge.id} className="text-sm">{badge.name}</li>
                ))}
              </ul>
            ) : <Empty>この月に獲得したバッジはありません。</Empty>}
          </RecapCard>
          <RecapCard>
            <h2 className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
              届いた声
            </h2>
            {recap.messages.length ? (
              <ul className="mt-3 space-y-3">
                {recap.messages.map((message, i) => (
                  <li key={`${message.kind}-${i}`} className="rounded-xl bg-[var(--surface-subtle)] p-3 text-sm">
                    <strong>{message.senderName}さん</strong>
                    <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>この月に届いたメッセージはありません。</Empty>}
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">おめでとう {recap.reactions.CONGRATS}・すごい {recap.reactions.AMAZING}・教えてほしい {recap.reactions.WANT_TO_LEARN}</p>
          </RecapCard>
        </div>
      </div>
      {recap.nextStep ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
            来月の一歩
          </h2>
          <p className="mt-2 text-sm">{recap.nextStep}</p>
          <Link href="/my/skills" className="mt-4 inline-flex h-10 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]">スキルシートで申請する</Link>
        </section>
      ) : null}
    </div>
  );
}

function MonthLink({ month, direction }: { month?: string; direction: "previous" | "next" }) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const label = direction === "previous" ? "前の月" : "次の月";
  if (!month) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="icon"
        disabled
        aria-label={`${label}はありません`}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <Link
      href={`/my/recap?month=${month}` as Route}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <RecapCard>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[var(--primary)]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</p> : null}
    </RecapCard>
  );
}
function RecapCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {children}
    </section>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-[var(--muted-foreground)]">{children}</p>;
}
function Progress({ startValue, endValue }: { startValue: number; endValue: number }) {
  const increase = Math.max(0, endValue - startValue);
  return (
    <div
      className="mt-2 flex h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
      role="progressbar"
      aria-valuenow={endValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="block h-full bg-[var(--primary)]" style={{ width: `${startValue}%` }} />
      <span className="block h-full bg-[#5EEAD4]" style={{ width: `${increase}%` }} />
    </div>
  );
}
function formatMonth(month: string) {
  return `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
}
function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(new Date(value));
}
