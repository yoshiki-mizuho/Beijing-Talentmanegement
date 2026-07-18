"use client";

import { ListPlus, Plus, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { createSkillAssessmentsAction } from "@/modules/members/presentation/actions";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";

type SkillOption = {
  id: string;
  name: string;
  categoryName: string;
};

type AssessmentRow = {
  skillId: string;
  requestedLevel: number;
  yearsOfExperience: string;
};

const initialState: Parameters<typeof createSkillAssessmentsAction>[0] = {
  status: "idle"
};

export function SkillAssessmentBatchForm({ skills }: { skills: SkillOption[] }) {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState(skills[0]?.id ?? "");
  const [state, formAction, isPending] = useActionState(
    createSkillAssessmentsAction,
    initialState
  );
  const selectedSkillIds = useMemo(
    () => new Set(rows.map((row) => row.skillId)),
    [rows]
  );
  const availableSkills = skills.filter((skill) => !selectedSkillIds.has(skill.id));

  function addSkill() {
    if (!selectedSkillId || selectedSkillIds.has(selectedSkillId)) {
      return;
    }

    const remainingSkills = availableSkills.filter(
      (skill) => skill.id !== selectedSkillId
    );
    setRows((current) => [
      ...current,
      { skillId: selectedSkillId, requestedLevel: 1, yearsOfExperience: "" }
    ]);
    setSelectedSkillId(remainingSkills[0]?.id ?? "");
  }

  function updateRow(skillId: string, patch: Partial<AssessmentRow>) {
    setRows((current) =>
      current.map((row) => row.skillId === skillId ? { ...row, ...patch } : row)
    );
  }

  function removeRow(skillId: string) {
    setRows((current) => current.filter((row) => row.skillId !== skillId));
    if (!selectedSkillId) {
      setSelectedSkillId(skillId);
    }
  }

  const payload = rows.map((row) => ({
    skillId: row.skillId,
    requestedLevel: row.requestedLevel,
    ...(row.yearsOfExperience === ""
      ? {}
      : { yearsOfExperience: Number(row.yearsOfExperience) })
  }));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="assessments" value={JSON.stringify(payload)} />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <Label htmlFor="skill-to-add">追加するスキル</Label>
          <Select
            id="skill-to-add"
            value={selectedSkillId}
            onChange={(event) => setSelectedSkillId(event.target.value)}
            className="mt-1"
            disabled={isPending || availableSkills.length === 0}
          >
            {availableSkills.length === 0 ? (
              <option value="">追加できるスキルはありません</option>
            ) : null}
            {availableSkills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.categoryName} / {skill.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={addSkill}
          disabled={isPending || !selectedSkillId}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          追加
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-[var(--border-strong)]">
          <EmptyState
            icon={ListPlus}
            title="申請するスキルがありません"
            description="上の選択欄からスキルを追加し、レベルを設定してください。"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const skill = skills.find((item) => item.id === row.skillId);
            const levelId = `level-${row.skillId}`;
            const experienceId = `experience-${row.skillId}`;

            return (
              <fieldset
                key={row.skillId}
                className="grid gap-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.4fr)_160px_auto] lg:items-end"
                disabled={isPending}
              >
                <legend className="sr-only">{skill?.name}の申請内容</legend>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {skill?.name}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {skill?.categoryName}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label htmlFor={levelId}>申告レベル</Label>
                    <output
                      htmlFor={levelId}
                      className="min-w-12 text-right text-sm font-semibold text-[var(--primary)]"
                      aria-live="polite"
                    >
                      Lv.{row.requestedLevel}
                    </output>
                  </div>
                  <input
                    id={levelId}
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={row.requestedLevel}
                    onChange={(event) =>
                      updateRow(row.skillId, {
                        requestedLevel: Number(event.target.value)
                      })
                    }
                    className="h-5 w-full cursor-pointer accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-valuetext={`レベル${row.requestedLevel}`}
                  />
                  <div className="mt-1 flex justify-between px-0.5 text-xs text-[var(--muted-foreground)]" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((level) => <span key={level}>{level}</span>)}
                  </div>
                </div>

                <div>
                  <Label htmlFor={experienceId}>経験年数（任意）</Label>
                  <Input
                    id={experienceId}
                    type="number"
                    min="0"
                    max="99.9"
                    step="0.1"
                    value={row.yearsOfExperience}
                    onChange={(event) =>
                      updateRow(row.skillId, { yearsOfExperience: event.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(row.skillId)}
                  aria-label={`${skill?.name}を申請一覧から削除`}
                  title="削除"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </fieldset>
            );
          })}
        </div>
      )}

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error"
            ? "text-sm font-medium text-[var(--destructive)]"
            : "text-sm font-medium text-[var(--success)]"}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {rows.length}件をまとめて申請
        </p>
        <Button type="submit" disabled={isPending || rows.length === 0}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {isPending ? "一括申請中..." : "一括申請"}
        </Button>
      </div>
    </form>
  );
}