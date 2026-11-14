"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/shared/ui/empty-state";
import { Button } from "@/shared/ui/button";
import { SubmitButton } from "@/shared/ui/submit-button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { ActionResult } from "@/shared/lib/action-result";
import { BUSINESS_AREAS, CAREER_PHASES, CAREER_ROLES, TEAM_SIZES } from "../domain/career-options";
import { calculateExperienceLabel, formatCareerMonth } from "../domain/career-display";
import {
  addCertificationAction,
  deleteCertificationAction,
  deleteProjectHistoryAction,
  saveProjectHistoryAction,
  saveSkillSheetBasicsAction
} from "./actions";

type History = {
  id: string;
  title: string;
  startMonth: string;
  endMonth: string | null;
  industry: string;
  summary: string;
  role: string;
  teamSize: string;
  businessArea: string | null;
  phases: string[];
  technologies: string[];
};

type Certification = { id: string; name: string; acquiredMonth: string | null };

const initialState: ActionResult | null = null;

export function CareerPanel({
  memberId,
  histories,
  certifications,
  itCareerStartMonth,
  skillSheetNote
}: {
  memberId: string;
  histories: History[];
  certifications: Certification[];
  itCareerStartMonth: string | null;
  skillSheetNote: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">案件の経歴</h2>
          <Button variant="secondary" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            経歴を追加
          </Button>
        </div>
        {adding ? (
          <HistoryForm memberId={memberId} onCancel={() => setAdding(false)} />
        ) : null}
        <div className="mt-4 space-y-4">
          {histories.length === 0 && !adding ? <EmptyState title="経歴はまだありません" /> : null}
          {histories.map((history) => editingId === history.id ? (
            <HistoryForm
              key={history.id}
              memberId={memberId}
              history={history}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <article key={history.id} className="relative rounded-xl border border-[var(--border)] p-4">
              <button
                type="button"
                className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-md hover:bg-[var(--surface-subtle)]"
                aria-label="この経歴を編集"
                onClick={() => setEditingId(history.id)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="text-sm text-[var(--muted-foreground)]">
                {formatCareerMonth(history.startMonth)}〜{history.endMonth ? formatCareerMonth(history.endMonth) : "現在"}
              </p>
              <h3 className="mt-1 pr-12 font-bold">{history.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm">{history.summary}</p>
              <Chips
                values={[
                  history.industry,
                  history.role,
                  history.teamSize,
                  history.businessArea
                ].filter(Boolean) as string[]}
                variant="neutral"
              />
              <Chips
                values={[...history.phases, ...history.technologies]}
                variant="primary"
              />
            </article>
          ))}
        </div>
      </section>
      <div className="space-y-5">
        <CertificationCard memberId={memberId} certifications={certifications} />
        <BasicsCard
          memberId={memberId}
          itCareerStartMonth={itCareerStartMonth}
          skillSheetNote={skillSheetNote}
        />
      </div>
    </div>
  );
}

function HistoryForm({
  memberId,
  history,
  onCancel
}: {
  memberId: string;
  history?: History;
  onCancel: () => void;
}) {
  const [state, action] = useActionState(
    (_state: ActionResult | null, formData: FormData) => saveProjectHistoryAction(formData),
    initialState
  );
  useResultToast(state, onCancel);
  return (
    <form
      action={action}
      className="mt-4 space-y-4 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-subtle)] p-4"
    >
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="id" value={history?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="開始年月">
          <input
            name="startMonth"
            type="month"
            defaultValue={history?.startMonth}
            required
            className={inputClass}
          />
        </Field>
        <Field label="終了年月">
          <input
            name="endMonth"
            type="month"
            defaultValue={history?.endMonth ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="業種">
          <input
            name="industry"
            defaultValue={history?.industry}
            maxLength={50}
            required
            className={inputClass}
          />
        </Field>
        <Field label="規模">
          <Select name="teamSize" values={TEAM_SIZES} value={history?.teamSize} />
        </Field>
      </div>
      <Field label="案件名">
        <input
          name="title"
          defaultValue={history?.title}
          maxLength={60}
          required
          className={inputClass}
        />
      </Field>
      <Field label="案件の概要（顧客名は書かない）">
        <textarea
          name="summary"
          defaultValue={history?.summary}
          maxLength={500}
          required
          className={`${inputClass} min-h-24 py-2`}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="役割">
          <Select name="role" values={CAREER_ROLES} value={history?.role} />
        </Field>
        <Field label="業務領域">
          <Select
            name="businessArea"
            values={BUSINESS_AREAS}
            value={history?.businessArea ?? ""}
            optional
          />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">担当工程</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {CAREER_PHASES.map((phase) => (
            <label key={phase} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="phases"
                value={phase}
                defaultChecked={history?.phases.includes(phase)}
              />
              {phase}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="技術">
        <input
          name="technologies"
          defaultValue={history?.technologies.join("、")}
          className={inputClass}
        />
      </Field>
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          {history ? (
            <DeleteHistoryButton memberId={memberId} id={history.id} onSuccess={onCancel} />
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
          <SubmitButton pendingLabel="保存中…">
            保存
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

function DeleteHistoryButton({
  memberId,
  id,
  onSuccess
}: {
  memberId: string;
  id: string;
  onSuccess: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  function remove() {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("id", id);
    startTransition(async () => {
      const result = await deleteProjectHistoryAction(formData);
      toast[result.status === "success" ? "success" : "error"](result.message);
      if (result.status === "success") onSuccess();
      setConfirming(false);
    });
  }
  return (
    <>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        {pending ? "削除中…" : "削除"}
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title="この経歴を削除しますか"
        description="削除した経歴は元に戻せません。"
        confirmLabel="削除する"
        destructive
      />
    </>
  );
}

function CertificationCard({
  memberId,
  certifications
}: {
  memberId: string;
  certifications: Certification[];
}) {
  const [state, action] = useActionState(
    (_state: ActionResult | null, formData: FormData) => addCertificationAction(formData),
    initialState
  );
  useResultToast(state);
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold">資格</h2>
      <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="memberId" value={memberId} />
        <input
          name="name"
          aria-label="資格名"
          placeholder="資格名"
          maxLength={100}
          required
          className={inputClass}
        />
        <input
          name="acquiredMonth"
          aria-label="取得年月"
          type="month"
          className={inputClass}
        />
        <SubmitButton className="sm:col-span-2" pendingLabel="追加中…">
          <Plus className="h-4 w-4" aria-hidden="true" />
          追加
        </SubmitButton>
      </form>
      {certifications.length === 0 ? <EmptyState title="資格はまだありません" /> : (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {certifications.map((item) => (
            <li
              key={item.id}
              className="flex min-h-14 items-center justify-between gap-2 py-2"
            >
              <span>
                <strong className="block text-sm">{item.name}</strong>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {item.acquiredMonth
                    ? formatCareerMonth(item.acquiredMonth)
                    : "年月なし"}
                </span>
              </span>
              <DeleteCertificationButton memberId={memberId} id={item.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeleteCertificationButton({ memberId, id }: { memberId: string; id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("id", id);
    startTransition(async () => {
      const result = await deleteCertificationAction(formData);
      toast[result.status === "success" ? "success" : "error"](result.message);
      setConfirming(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="この資格を削除"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title="この資格を削除しますか"
        description="削除した資格は元に戻せません。"
        confirmLabel="削除する"
        destructive
      />
    </>
  );
}

function BasicsCard({
  memberId,
  itCareerStartMonth,
  skillSheetNote
}: {
  memberId: string;
  itCareerStartMonth: string | null;
  skillSheetNote: string | null;
}) {
  const [state, action] = useActionState(
    (_state: ActionResult | null, formData: FormData) => saveSkillSheetBasicsAction(formData),
    initialState
  );
  useResultToast(state);
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-bold">シートの基本情報</h2>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="memberId" value={memberId} />
        <Field label="ITの仕事を始めた年月">
          <div className="flex items-center gap-3">
            <input
              name="itCareerStartMonth"
              type="month"
              defaultValue={itCareerStartMonth ?? ""}
              className={inputClass}
            />
            <span className="shrink-0 text-sm font-semibold">
              {calculateExperienceLabel(itCareerStartMonth)}
            </span>
          </div>
        </Field>
        <Field label="ひとこと（自己PRの材料）">
          <textarea
            name="skillSheetNote"
            defaultValue={skillSheetNote ?? ""}
            maxLength={300}
            className={`${inputClass} min-h-24 py-2`}
          />
        </Field>
        <SubmitButton className="w-full" pendingLabel="保存中…">
          保存
        </SubmitButton>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1 block font-normal">{children}</span>
    </label>
  );
}

function Select({
  name,
  values,
  value,
  optional = false
}: {
  name: string;
  values: readonly string[];
  value?: string;
  optional?: boolean;
}) {
  const options = value && !values.includes(value) ? [value, ...values] : values;
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      required={!optional}
      className={inputClass}
    >
      {optional ? (
        <option value="">選択なし</option>
      ) : (
        <option value="" disabled>選択してください</option>
      )}
      {options.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}

function Chips({ values, variant }: { values: string[]; variant: "neutral" | "primary" }) {
  const colorClass = variant === "primary"
    ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
    : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)]";
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function useResultToast(state: ActionResult | null, onSuccess?: () => void) {
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!state) return;
    toast[state.status === "success" ? "success" : "error"](state.message);
    if (state.status === "success") onSuccessRef.current?.();
  }, [state]);
}

const inputClass = "h-11 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm";
