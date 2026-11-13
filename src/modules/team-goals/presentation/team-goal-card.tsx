"use client";

import { Minus, Pencil, Plus, Target } from "lucide-react";
import { useState } from "react";

import type {
  ManagerTeamGoalData,
  TeamGoalCardData
} from "@/modules/team-goals/application/team-goal-service";
import {
  formatTeamGoalRange,
  teamGoalUnit,
  type TeamGoalKindValue
} from "@/modules/team-goals/domain/team-goal";
import { saveTeamGoalAction } from "@/modules/team-goals/presentation/actions";
import { cn } from "@/shared/lib/utils";
import { ActionForm } from "@/shared/ui/action-form";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { Select } from "@/shared/ui/select";
import { SubmitButton } from "@/shared/ui/submit-button";

const periodOptions = [
  { months: 1, label: "1か月", previousLabel: "先月" },
  { months: 3, label: "3か月", previousLabel: "前の3か月" },
  { months: 6, label: "半年", previousLabel: "前の半年" },
  { months: 12, label: "1年", previousLabel: "前の1年" }
];

const kindOptions: { kind: TeamGoalKindValue; label: string }[] = [
  { kind: "LEVEL_UP_COUNT", label: "レベルアップの件数" },
  { kind: "LEVEL_UP_MEMBERS", label: "レベルアップした人数" },
  { kind: "SKILL_REACH", label: "スキルの到達人数" }
];

export function ManagerTeamGoalCard({ data }: { data: ManagerTeamGoalData }) {
  const [open, setOpen] = useState(false);
  const goal = data.goal;

  return (
    <>
      {goal ? (
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5">
          <div className="flex items-center gap-3">
            <GoalIcon />
            <h2 className="min-w-0 flex-1 text-sm font-semibold">{goal.heading}</h2>
            <span className="text-xs text-[var(--muted-foreground)]">
              残り {goal.remainingDays}日
            </span>
            {goal.achieved ? (
              <Button className="h-11" onClick={() => setOpen(true)}>
                次の目標を決める
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="h-11 w-11 rounded-full p-0"
                aria-label="目標を変更"
                onClick={() => setOpen(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-xl font-bold">{goal.text}</p>
            {goal.note ? (
              <p className="text-sm text-[var(--muted-foreground)]">{goal.note}</p>
            ) : null}
          </div>
          <GoalProgress goal={goal} showStatus />
        </section>
      ) : (
        <section className="flex min-h-[120px] flex-wrap items-center gap-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-4">
          <GoalIcon large />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">チーム目標</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">まだ決まっていません</p>
          </div>
          <Button className="h-11" onClick={() => setOpen(true)}>
            目標を決める
          </Button>
        </section>
      )}
      {open ? <GoalDialog data={data} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function MemberTeamGoalCard({ goal }: { goal: TeamGoalCardData }) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-3">
        <GoalIcon />
        <h2 className="min-w-0 flex-1 text-sm font-semibold">{goal.heading}</h2>
        <span className="text-xs text-[var(--muted-foreground)]">
          残り {goal.remainingDays}日
        </span>
      </div>
      <p className="text-xl font-bold">{goal.text}</p>
      <GoalProgress goal={goal} showStatus={goal.achieved} />
      {goal.manager && goal.note ? (
        <div className="flex items-center gap-2">
          <MemberAvatar
            memberId={goal.manager.id}
            name={goal.manager.name}
            avatarUpdatedAt={goal.manager.avatarUpdatedAt}
          />
          <p className="text-sm text-[var(--muted-foreground)]">{goal.note}</p>
        </div>
      ) : null}
    </section>
  );
}

function GoalProgress({ goal, showStatus }: { goal: TeamGoalCardData; showStatus: boolean }) {
  const percent = Math.min(100, Math.round((goal.progress / goal.targetCount) * 100));
  const remaining = Math.max(0, goal.targetCount - goal.progress);

  return (
    <div className="flex items-center gap-4">
      <div
        className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"
        role="progressbar"
        aria-label="チーム目標の進み具合"
        aria-valuemin={0}
        aria-valuemax={goal.targetCount}
        aria-valuenow={Math.min(goal.progress, goal.targetCount)}
      >
        <div
          className="h-full rounded-full bg-[var(--primary)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="whitespace-nowrap text-sm font-bold">
        <span className="text-xl text-[var(--primary)]">{goal.progress}</span> / {goal.targetCount}
        {goal.unit}
      </p>
      {showStatus ? (
        <p className="whitespace-nowrap rounded-full bg-[var(--primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--primary-hover)]">
          {goal.achieved ? "達成" : `あと${remaining}${goal.unit}`}
        </p>
      ) : null}
    </div>
  );
}

function GoalDialog({ data, onClose }: { data: ManagerTeamGoalData; onClose: () => void }) {
  // 達成済みの目標は変えられないので、新しい目標として決める
  const existing = data.goal && !data.goal.achieved ? data.goal : null;
  const [months, setMonths] = useState(existing?.months ?? 1);
  const [kind, setKind] = useState<TeamGoalKindValue>(existing?.kind ?? "LEVEL_UP_COUNT");
  const [skillId, setSkillId] = useState<string | null>(existing?.skillId ?? null);
  const [targetLevel, setTargetLevel] = useState(existing?.targetLevel ?? 3);
  const [count, setCount] = useState(existing?.targetCount ?? 1);

  const period = periodOptions.find((option) => option.months === months) ?? periodOptions[0];
  const startMonth = existing?.startMonth ?? data.currentMonth;
  const skillOptions = data.skills.map((skill) => ({
    value: skill.id,
    label: skill.name,
    group: skill.category.name
  }));
  const selectedSkill = data.skills.find((skill) => skill.id === skillId);
  const currentReach =
    selectedSkill?.memberSkills.filter((item) => item.level >= targetLevel).length ?? 0;

  return (
    <Dialog
      open
      onClose={onClose}
      title="チーム目標"
      eyebrow={formatTeamGoalRange(startMonth, months)}
      className="max-w-xl"
    >
      <ActionForm action={saveTeamGoalAction} className="space-y-6" onSuccess={onClose}>
        {existing ? <input type="hidden" name="id" value={existing.id} /> : null}
        <input type="hidden" name="months" value={months} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="skillId" value={skillId ?? ""} />
        <input type="hidden" name="targetLevel" value={targetLevel} />

        <div role="group" aria-label="期間" className="grid grid-cols-4 gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.months}
              type="button"
              aria-pressed={months === option.months}
              className={cn(
                "h-11 rounded-full border text-sm",
                months === option.months
                  ? "border-[var(--primary)] bg-[var(--primary)] font-bold text-white"
                  : "border-[var(--border-strong)] bg-[var(--surface)] font-medium hover:bg-[var(--surface-subtle)]"
              )}
              onClick={() => setMonths(option.months)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div role="group" aria-label="目標の型" className="space-y-2.5">
          {kindOptions.map((option) => {
            const selected = kind === option.kind;
            const previous =
              option.kind === "SKILL_REACH"
                ? null
                : data.previous[`${months}:${option.kind}`];
            return (
              <button
                key={option.kind}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-[15px]",
                  selected
                    ? "border-2 border-[var(--primary)] bg-[var(--primary-subtle)] font-bold"
                    : "border border-[var(--border-strong)] bg-[var(--surface)] font-medium hover:bg-[var(--surface-subtle)]"
                )}
                onClick={() => setKind(option.kind)}
              >
                <span>{option.label}</span>
                {previous !== null && previous !== undefined ? (
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">
                    {period.previousLabel} {previous}
                    {teamGoalUnit(option.kind)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {kind === "SKILL_REACH" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Combobox
              id="team-goal-skill"
              label="スキル"
              options={skillOptions}
              value={skillId}
              onChange={setSkillId}
            />
            <div>
              <Label htmlFor="team-goal-level">レベル</Label>
              <Select
                id="team-goal-level"
                value={targetLevel}
                onChange={(event) => setTargetLevel(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level === 5 ? "Lv5" : `Lv${level} 以上`}
                  </option>
                ))}
              </Select>
            </div>
            {skillId ? (
              <p className="text-sm text-[var(--muted-foreground)] sm:col-span-2">
                いま {currentReach}人
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <Label htmlFor="team-goal-count">数</Label>
          <div className="mt-1 flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              className="h-11 w-11 rounded-full p-0"
              aria-label="数を1減らす"
              onClick={() => setCount((value) => Math.max(1, value - 1))}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Input
              id="team-goal-count"
              name="targetCount"
              type="number"
              min={1}
              max={999}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="h-14 w-28 text-center text-3xl font-bold text-[var(--primary)]"
            />
            <span className="w-6 text-sm font-medium">{teamGoalUnit(kind)}</span>
            <Button
              variant="secondary"
              className="h-11 w-11 rounded-full p-0"
              aria-label="数を1増やす"
              onClick={() => setCount((value) => Math.min(999, value + 1))}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="team-goal-note">ひとこと</Label>
          <Input
            id="team-goal-note"
            name="note"
            maxLength={60}
            defaultValue={existing?.note ?? ""}
            className="mt-1 w-full"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="h-11" onClick={onClose}>
            キャンセル
          </Button>
          <SubmitButton className="h-11">{existing ? "変更する" : "目標を決める"}</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}

function GoalIcon({ large = false }: { large?: boolean }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center bg-[var(--primary-subtle)] text-[var(--primary)]",
        large ? "h-12 w-12 rounded-xl" : "h-9 w-9 rounded-[10px]"
      )}
    >
      <Target className={large ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
    </div>
  );
}
