"use client";

import { Check, ClipboardCheck, Pencil, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  approveSkillAssessmentsAction,
  reviewSkillAssessmentAction
} from "@/modules/members/presentation/actions";
import {
  getMemberAvatarTone,
  getMemberInitial,
  getSkillApprovalLevelChange,
  isSkillApprovalLongWaiting,
  type SkillApprovalRow
} from "@/modules/members/presentation/skill-approval";
import { cn } from "@/shared/lib/utils";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { TextareaField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";

const skillLevels = [1, 2, 3, 4, 5] as const;
const reviewStatuses = {
  approved: "APPROVED",
  corrected: "CORRECTED",
  rejected: "REJECTED"
} as const;

export function SkillApprovalList({ rows }: { rows: SkillApprovalRow[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allSelected =
    rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = rows.some((row) => selectedIds.has(row.id));
  const selectedCount = rows.filter((row) => selectedIds.has(row.id)).length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [allSelected, someSelected]);

  if (rows.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl">
        <Link
          href="/dashboard"
          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          aria-label="承認待ちはありません。チームのレベルアップにリアクションを送ってみませんか。"
        >
          <EmptyState
            icon={ClipboardCheck}
            title="承認待ちはありません"
            description="チームのレベルアップにリアクションを送ってみませんか。"
          />
        </Link>
      </Card>
    );
  }

  function toggleAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(rows.map((row) => row.id))
    );
  }

  function toggleOne(assessmentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(assessmentId)) {
        next.delete(assessmentId);
      } else {
        next.add(assessmentId);
      }
      return next;
    });
  }

  function removeSelection(assessmentId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(assessmentId);
      return next;
    });
  }

  const selectedAssessmentIds = rows
    .filter((row) => selectedIds.has(row.id))
    .map((row) => row.id);

  return (
    <div className="space-y-4">
      <Card className="sticky top-2 z-20 rounded-2xl p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label
            htmlFor="select-all-skill-approvals"
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[var(--foreground)]"
          >
            <input
              ref={selectAllRef}
              id="select-all-skill-approvals"
              type="checkbox"
              checked={allSelected}
              aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
              onChange={toggleAll}
              className="h-5 w-5 accent-[var(--primary)]"
            />
            すべて選択
          </label>

          <ActionForm
            action={approveSkillAssessmentsAction}
            confirm={{
              title: `${selectedCount}件の申請を承認しますか`,
              description: "選択した申請をまとめて承認します。",
              confirmLabel: "承認する"
            }}
            onSuccess={() => setSelectedIds(new Set())}
          >
            <input
              type="hidden"
              name="assessmentIds"
              value={JSON.stringify(selectedAssessmentIds)}
            />
            <SubmitButton
              disabled={selectedCount === 0}
              pendingLabel="一括承認中…"
              className="w-full sm:w-auto"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              選択した {selectedCount}件を承認
            </SubmitButton>
          </ActionForm>
        </div>
        <p
          className="text-xs text-[var(--muted-foreground)] sm:text-right"
          aria-live="polite"
        >
          {selectedCount}件を選択中
        </p>
      </Card>

      <div className="space-y-4" role="list" aria-label="承認待ちのスキル申請">
        {rows.map((row) => (
          <div key={row.id} role="listitem">
            <SkillApprovalItem
              row={row}
              selected={selectedIds.has(row.id)}
              onSelectedChange={() => toggleOne(row.id)}
              onReviewed={() => removeSelection(row.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillApprovalItem({
  row,
  selected,
  onSelectedChange,
  onReviewed
}: {
  row: SkillApprovalRow;
  selected: boolean;
  onSelectedChange: () => void;
  onReviewed: () => void;
}) {
  const [expanded, setExpanded] = useState<"correct" | "reject" | null>(null);
  const [correctedLevel, setCorrectedLevel] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const correctionRegionId = `correction-${row.id}`;
  const rejectionRegionId = `rejection-${row.id}`;
  const accessibleSubject = `${row.memberName}の${row.skillName}`;

  function toggleCorrection() {
    setExpanded((current) => {
      if (current === "correct") return null;
      setCorrectedLevel(null);
      return "correct";
    });
  }

  function toggleRejection() {
    setExpanded((current) => (current === "reject" ? null : "reject"));
  }

  return (
    <Card
      role="group"
      aria-label={`${row.memberName} / ${row.skillName}の承認`}
      className="rounded-2xl p-5"
    >
      <div className="flex items-start gap-3">
        <label className="flex min-h-11 cursor-pointer items-center" title="一括承認の対象に選択">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelectedChange}
            aria-label={`${accessibleSubject}申請を選択`}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            getMemberAvatarTone(row.memberId)
          )}
          aria-hidden="true"
        >
          {getMemberInitial(row.memberName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--foreground)]">{row.memberName}</p>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            {row.departmentName} / {row.jobTitle ?? "役職未設定"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-y border-[var(--border)] py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">スキル</p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {row.skillName}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {row.categoryName}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">レベル</p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {getSkillApprovalLevelChange(row.currentLevel, row.requestedLevel)}
          </p>
          {row.targetRequiredLevel !== null ? (
            <Badge variant="primary" className="mt-2">
              目標ロールで Lv{row.targetRequiredLevel} 必要
            </Badge>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">経験年数</p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {row.yearsOfExperience === null ? "—" : `${row.yearsOfExperience}年`}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">申請日</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <time dateTime={row.submittedAt} className="text-sm font-semibold text-[var(--foreground)]">
              {row.submittedDateLabel}
            </time>
            <Badge
              variant={isSkillApprovalLongWaiting(row.waitingDays) ? "warning" : "neutral"}
            >
              {row.waitingDays}日待ち
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <ActionForm action={reviewSkillAssessmentAction} onSuccess={onReviewed}>
          <input type="hidden" name="assessmentId" value={row.id} />
          <input
            type="hidden"
            name="status"
            value={reviewStatuses.approved}
          />
          <SubmitButton
            pendingLabel="承認中…"
            aria-label={`${accessibleSubject}を承認`}
          >
            承認
          </SubmitButton>
        </ActionForm>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          aria-expanded={expanded === "correct"}
          aria-controls={correctionRegionId}
          aria-label={`${accessibleSubject}を補正`}
          onClick={toggleCorrection}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          補正
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="min-h-11"
          aria-expanded={expanded === "reject"}
          aria-controls={rejectionRegionId}
          aria-label={`${accessibleSubject}を差し戻し`}
          onClick={toggleRejection}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          差し戻し
        </Button>
      </div>

      {expanded === "correct" ? (
        <ActionForm
          id={correctionRegionId}
          action={reviewSkillAssessmentAction}
          onSuccess={onReviewed}
          className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
        >
          <input type="hidden" name="assessmentId" value={row.id} />
          <input
            type="hidden"
            name="status"
            value={
              correctedLevel === row.requestedLevel
                ? reviewStatuses.approved
                : reviewStatuses.corrected
            }
          />
          <input
            type="hidden"
            name="correctedLevel"
            value={correctedLevel ?? ""}
          />
          <p className="text-sm font-semibold text-[var(--foreground)]">
            承認するレベルを選択
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            申告と同じ Lv{row.requestedLevel} を選ぶと、通常の承認として扱います。
          </p>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label={`${accessibleSubject}の補正レベル`}
          >
            {skillLevels.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={correctedLevel === level}
                aria-label={`レベル${level}`}
                onClick={() => setCorrectedLevel(level)}
                className={cn(
                  "h-11 min-w-11 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
                  correctedLevel === level
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                )}
              >
                Lv{level}
              </button>
            ))}
          </div>
          <TextareaField
            id={`correction-comment-${row.id}`}
            name="managerComment"
            label="マネージャーコメント（任意）"
            maxLength={1000}
            className="mt-4"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => setExpanded(null)}>
              閉じる
            </Button>
            <SubmitButton
              disabled={correctedLevel === null}
              pendingLabel="承認中…"
              aria-label={`${accessibleSubject}を選択したレベルで承認`}
            >
              このレベルで承認
            </SubmitButton>
          </div>
        </ActionForm>
      ) : null}

      {expanded === "reject" ? (
        <ActionForm
          id={rejectionRegionId}
          action={reviewSkillAssessmentAction}
          onSuccess={onReviewed}
          className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4"
        >
          <input type="hidden" name="assessmentId" value={row.id} />
          <input
            type="hidden"
            name="status"
            value={reviewStatuses.rejected}
          />
          <TextareaField
            id={`rejection-reason-${row.id}`}
            name="managerComment"
            label="差し戻し理由"
            description="メンバーが次に取れる行動を具体的に記載してください。"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            required
            maxLength={1000}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => setExpanded(null)}>
              閉じる
            </Button>
            <ConfirmSubmitButton
              disabled={!rejectionReason.trim()}
              pendingLabel="差し戻し中…"
              variant="destructive"
              aria-label={`${accessibleSubject}を差し戻す`}
              confirm={{
                title: "スキル申請を差し戻しますか",
                description: "入力した理由とともに申請を差し戻します。",
                confirmLabel: "差し戻す",
                destructive: true
              }}
            >
              差し戻す
            </ConfirmSubmitButton>
          </div>
        </ActionForm>
      ) : null}
    </Card>
  );
}
