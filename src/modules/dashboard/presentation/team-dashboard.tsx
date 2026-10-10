"use client";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarClock,
  ClipboardCheck,
  PartyPopper,
  Target,
  TrendingUp,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";

import type { TeamDashboardViewModel } from "@/modules/dashboard/presentation/team-dashboard-view-model";
import { createCheerAction, createOneOnOneNoteAction } from "@/modules/growth/presentation/actions";
import { LevelUpFeed } from "@/modules/growth/presentation/level-up-feed";
import { cn } from "@/shared/lib/utils";
import { ActionForm } from "@/shared/ui/action-form";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";
import { SubmitButton } from "@/shared/ui/submit-button";

export function TeamDashboard({ viewModel }: { viewModel: TeamDashboardViewModel }) {
  const [cheerTarget, setCheerTarget] = useState<TeamDashboardViewModel["almostThere"][number] | null>(null);
  const [cheeredIds, setCheeredIds] = useState(() => new Set(viewModel.almostThere.filter((item) => item.cheered).map((item) => item.memberId)));
  const [noteTarget, setNoteTarget] = useState<TeamDashboardViewModel["inactiveMembers"][number] | null>(null);
  const [notedIds, setNotedIds] = useState(() => new Set(viewModel.inactiveMembers.filter((item) => item.noteAdded).map((item) => item.memberId)));
  if (viewModel.memberCount === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <EmptyState
          icon={UsersRound}
          title="部下が登録されていません"
          description="上司の設定は ADMIN がメンバー詳細から行えます。"
        />
      </section>
    );
  }

  const maxMissingCount = Math.max(1, ...viewModel.missingSkills.map((skill) => skill.count));
  const topMissingSkill = viewModel.missingSkills[0];

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">チームの成長</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {viewModel.manager.departmentName}・部下 {viewModel.memberCount}名
            </p>
            <p className="mt-3 text-sm text-[var(--foreground)]">{viewModel.encouragement}</p>
          </div>
          <nav aria-label="表示する月" className="flex items-center justify-between gap-1 rounded-xl border border-[var(--border)] p-1">
            <Link
              href={`/dashboard?view=team&month=${viewModel.month.previousKey}` as Route}
              aria-label="前の月"
              className="grid h-11 w-11 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="min-w-28 text-center text-sm font-semibold">{viewModel.month.label}</span>
            <Link
              href={`/dashboard?view=team&month=${viewModel.month.nextKey}` as Route}
              aria-label="次の月"
              className="grid h-11 w-11 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <section aria-labelledby="team-kpi-heading">
        <h2 id="team-kpi-heading" className="sr-only">チームの指標</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            href="/skill-approvals"
            icon={ClipboardCheck}
            label="承認待ち"
            value={`${viewModel.kpis.pending.count}件`}
            caption={viewModel.kpis.pending.count > 0 ? `最長 ${viewModel.kpis.pending.longestWaitingDays}日待ち` : "現在、承認待ちはありません"}
            warning={viewModel.kpis.pending.needsAttention}
          />
          <KpiCard
            href={`/dashboard?view=team&month=${viewModel.month.key}#team-level-ups` as Route}
            icon={TrendingUp}
            label={`${Number(viewModel.month.key.slice(5))}月のレベルアップ`}
            value={`${viewModel.kpis.levelUps.count}件`}
            caption={viewModel.kpis.levelUps.comparison}
          />
          <KpiCard
            href="/members"
            icon={Award}
            label="ロール達成者"
            value={`${viewModel.kpis.achieved}/${viewModel.memberCount}名`}
            caption="目標ロールの必須要件を達成"
          />
          <KpiCard
            href="/members"
            icon={Target}
            label="目標ロールの設定"
            value={`${viewModel.kpis.targetSet}/${viewModel.memberCount}名`}
            caption={viewModel.kpis.targetSet < viewModel.memberCount ? "未設定のメンバーがいます" : "全員が設定済みです"}
            warning={viewModel.kpis.targetSet < viewModel.memberCount}
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <TeamSection icon={UserRoundCheck} id="almost-heading" title="あと一歩のメンバー" description="目標ロールの必須要件が、あと1件でそろうメンバーです。">
          {viewModel.almostThere.length > 0 ? (
            <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {viewModel.almostThere.map((item) => (
                <li key={item.memberId} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.memberName}　{item.roleName}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {item.skillName}　Lv{item.currentLevel} → 必要 Lv{item.requiredLevel}{item.pending ? "（申請中）" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <Button type="button" aria-label={`${item.memberName}を${cheeredIds.has(item.memberId) ? "応援しました" : "応援する"}`} variant={cheeredIds.has(item.memberId) ? "secondary" : "primary"} onClick={() => setCheerTarget(item)}>
                      {cheeredIds.has(item.memberId) ? "応援しました" : "応援する"}
                    </Button>
                    <Link href="/members" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)] hover:underline">一覧で確認</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={UserRoundCheck} title="あと一歩のメンバーはいません" description="目標に近づいたメンバーが見つかると、ここに表示します。" />
          )}
        </TeamSection>

        <TeamSection icon={CalendarClock} id="inactive-heading" title="しばらく申請のない部下" description="申告もレベル変更も60日以上ないメンバーです。">
          {viewModel.inactiveMembers.length > 0 ? (
            <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {viewModel.inactiveMembers.map((item) => (
                <li key={item.memberId} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold">{item.memberName}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      最後の更新：{formatLongDate(item.lastUpdatedAt)}（{item.daysAgo}日前）
                      {item.targetRoleUnset ? "・目標ロール未設定" : ""}
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setNoteTarget(item)}>
                    {notedIds.has(item.memberId) ? "1on1 メモに追加済み" : "1on1 メモに追加"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="長く更新のないメンバーはいません" description="チームの成長が継続して記録されています。" />
          )}
        </TeamSection>
      </div>

      <section id="team-level-ups" className="scroll-mt-20 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-labelledby="team-level-ups-heading">
        <SectionHeader icon={PartyPopper} id="team-level-ups-heading" title="チームのレベルアップ" description={`${viewModel.month.label}の前進を、新しい順に表示します。`} />
        <div className="border-t border-[var(--border)]">
          <LevelUpFeed items={viewModel.feed} viewer={{ memberId: viewModel.manager.id, memberName: viewModel.manager.name }} />
        </div>
      </section>

      <TeamSection icon={Target} id="missing-heading" title="チームで不足しているスキル" description="部下の目標ロールに必要なスキルを、未達の人数で集計しています。">
        {viewModel.missingSkills.length > 0 ? (
          <div className="border-t border-[var(--border)] p-5">
            <ul className="space-y-4">
              {viewModel.missingSkills.map((skill) => (
                <li key={skill.skillId}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{skill.skillName}</span>
                    <span className="text-[var(--muted-foreground)]">{skill.count}名</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[var(--muted)]">
                    <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.max(8, skill.count / maxMissingCount * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg bg-[var(--primary-subtle)] px-4 py-3 text-sm text-[var(--foreground)]">
              {topMissingSkill?.skillName} は社内に Lv4 以上が {viewModel.topMissingSkillExpertCount}名います。
            </p>
          </div>
        ) : (
          <EmptyState icon={Target} title="不足している必須スキルはありません" description="設定済みの目標ロールに向けた必須要件を、チーム全員が満たしています。" />
        )}
      </TeamSection>
      {cheerTarget ? (
        <CheerDialog target={cheerTarget} onClose={() => setCheerTarget(null)} onSuccess={() => {
          setCheeredIds((current) => new Set(current).add(cheerTarget.memberId));
          setCheerTarget(null);
        }} />
      ) : null}
      {noteTarget ? (
        <OneOnOneQuickDialog target={noteTarget} onClose={() => setNoteTarget(null)} onSuccess={() => {
          setNotedIds((current) => new Set(current).add(noteTarget.memberId));
          setNoteTarget(null);
        }} />
      ) : null}
    </div>
  );
}

function CheerDialog({ target, onClose, onSuccess }: {
  target: TeamDashboardViewModel["almostThere"][number];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState(target.message);
  return (
    <Dialog open onClose={onClose} title="応援する">
      <ActionForm action={createCheerAction} className="space-y-4" onSuccess={onSuccess}>
        <input type="hidden" name="toMemberId" value={target.memberId} />
        <input type="hidden" name="targetSkillId" value={target.skillId} />
        <div><Label>宛先</Label><p className="mt-1 text-sm font-semibold">{target.memberName}</p></div>
        <div>
          <Label htmlFor={`cheer-message-${target.memberId}`}>メッセージ</Label>
          <textarea id={`cheer-message-${target.memberId}`} name="message" required maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 min-h-32 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <p className="mt-1 text-right text-xs text-[var(--muted-foreground)]">残り {500 - message.length}文字</p>
        </div>
        <div>
          <Label htmlFor={`mentor-${target.memberId}`}>教えてもらえそうな人（任意）</Label>
          <Select id={`mentor-${target.memberId}`} name="mentorMemberId" defaultValue="" className="mt-1">
            <option value="">選ばない</option>
            {target.mentorCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}（Lv{candidate.level}）</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button><SubmitButton pendingLabel="送信中…">送信する</SubmitButton></div>
      </ActionForm>
    </Dialog>
  );
}

function OneOnOneQuickDialog({ target, onClose, onSuccess }: {
  target: TeamDashboardViewModel["inactiveMembers"][number];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [body, setBody] = useState(`最近のスキル更新について（${target.daysAgo}日更新なし）`);
  return (
    <Dialog open onClose={onClose} title="1on1 メモに追加" className="max-w-md">
      <ActionForm action={createOneOnOneNoteAction} className="space-y-4" onSuccess={onSuccess}>
        <input type="hidden" name="memberId" value={target.memberId} />
        <div><Label htmlFor={`quick-note-${target.memberId}`}>メモ</Label><textarea id={`quick-note-${target.memberId}`} name="body" required maxLength={500} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-28 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" /><p className="mt-1 text-right text-xs text-[var(--muted-foreground)]">残り {500 - body.length}文字</p></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button><SubmitButton pendingLabel="追加中…">追加する</SubmitButton></div>
      </ActionForm>
    </Dialog>
  );
}

function KpiCard({ href, icon: Icon, label, value, caption, warning = false }: { href: Route; icon: typeof ClipboardCheck; label: string; value: string; caption: string; warning?: boolean }) {
  return (
    <Link href={href} className={cn("rounded-2xl border bg-[var(--surface)] p-5 transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]", warning ? "border-amber-400 bg-amber-50" : "border-[var(--border)]")}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--muted-foreground)]">{label}</span>
        <span className={cn("grid h-9 w-9 place-items-center rounded-lg", warning ? "bg-amber-100 text-amber-800" : "bg-[var(--primary-subtle)] text-[var(--primary)]")}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      </div>
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className={cn("mt-1 text-xs", warning ? "font-medium text-amber-800" : "text-[var(--muted-foreground)]")}>{caption}</p>
    </Link>
  );
}

function TeamSection({ icon, id, title, description, children }: { icon: typeof ClipboardCheck; id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-labelledby={id}>
      <SectionHeader icon={icon} id={id} title={title} description={description} />
      {children}
    </section>
  );
}

function SectionHeader({ icon: Icon, id, title, description }: { icon: typeof ClipboardCheck; id: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <div><h2 id={id} className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p></div>
    </div>
  );
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(value);
}
