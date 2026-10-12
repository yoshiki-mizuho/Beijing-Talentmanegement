"use client";

import { Check, ClipboardCheck, Pencil, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  approveSkillAssessmentsAction,
  reviewSkillAssessmentAction
} from "@/modules/members/presentation/actions";
import {
  getSkillApprovalLevelChange,
  isSkillApprovalLongWaiting,
  type SkillApprovalRow
} from "@/modules/members/presentation/skill-approval";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { cn } from "@/shared/lib/utils";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { TextareaField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";

const skillLevels = [1, 2, 3, 4, 5] as const;
const statuses = { approved: "APPROVED", corrected: "CORRECTED", rejected: "REJECTED" } as const;

export function SkillApprovalList({ rows }: { rows: SkillApprovalRow[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = rows.some((row) => selectedIds.has(row.id));
  const selectedCount = rows.filter((row) => selectedIds.has(row.id)).length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [allSelected, someSelected]);

  if (rows.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl">
        <Link
          href="/dashboard"
          className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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

  const selectedAssessmentIds = rows.filter((row) => selectedIds.has(row.id)).map((row) => row.id);
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  const toggleOne = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const removeSelection = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <Card className="sticky top-2 z-20 rounded-2xl p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label
            htmlFor="select-all-skill-approvals"
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"
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
        <p className="text-xs text-[var(--muted-foreground)] sm:text-right" aria-live="polite">
          {selectedCount}件を選択中
        </p>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-[44px_minmax(150px,1.25fr)_minmax(130px,1fr)_minmax(140px,1fr)_80px_120px_minmax(330px,1.6fr)] gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] lg:grid">
          <span>
            <span className="sr-only">選択</span>
          </span>
          <span>メンバー</span>
          <span>スキル</span>
          <span>レベル</span>
          <span>経験年数</span>
          <span>申請日</span>
          <span>操作</span>
        </div>
        <div
          className="divide-y divide-[var(--border)]"
          role="list"
          aria-label="承認待ちのスキル申請"
        >
          {rows.map((row) => (
            <SkillApprovalItem
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              onSelectedChange={() => toggleOne(row.id)}
              onReviewed={() => removeSelection(row.id)}
            />
          ))}
        </div>
      </Card>
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
  const [dialog, setDialog] = useState<"correct" | "reject" | null>(null);
  const [correctedLevel, setCorrectedLevel] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const subject = `${row.memberName}の${row.skillName}`;
  const closeDialog = () => setDialog(null);
  const handleReviewed = () => {
    onReviewed();
    closeDialog();
  };

  return (
    <div
      role="listitem"
      aria-label={`${row.memberName} / ${row.skillName}の承認`}
      className="grid gap-3 px-4 py-4 lg:grid-cols-[44px_minmax(150px,1.25fr)_minmax(130px,1fr)_minmax(140px,1fr)_80px_120px_minmax(330px,1.6fr)] lg:items-center"
    >
      <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 lg:contents">
        <label className="flex min-h-11 cursor-pointer items-center" title="一括承認の対象に選択">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelectedChange}
            aria-label={`${subject}申請を選択`}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
        <div className="flex min-w-0 items-center gap-3">
          <MemberAvatar
            memberId={row.memberId}
            name={row.memberName}
            avatarUpdatedAt={row.avatarUpdatedAt}
            href={`/people/${row.memberId}`}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.memberName}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{row.departmentName}</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{row.skillName}</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{row.categoryName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 items-center gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-[minmax(130px,1fr)_80px_120px_minmax(330px,1.6fr)] lg:contents">
        <div>
          <p className="text-sm font-semibold">
            {getSkillApprovalLevelChange(row.currentLevel, row.requestedLevel)}
          </p>
          {row.targetRequiredLevel !== null ? (
            <Badge variant="primary" className="mt-1">
              目標 Lv{row.targetRequiredLevel}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm font-semibold">
          <span className="mr-2 text-xs text-[var(--muted-foreground)] lg:hidden">経験年数</span>
          {row.yearsOfExperience === null ? "—" : `${row.yearsOfExperience}年`}
        </p>
        <div>
          <time dateTime={row.submittedAt} className="text-sm font-semibold">
            {row.submittedDateLabel}
          </time>
          <Badge
            variant={isSkillApprovalLongWaiting(row.waitingDays) ? "warning" : "neutral"}
            className="mt-1"
          >
            {row.waitingDays}日待ち
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionForm action={reviewSkillAssessmentAction} onSuccess={onReviewed}>
            <input type="hidden" name="assessmentId" value={row.id} />
            <input type="hidden" name="status" value={statuses.approved} />
            <SubmitButton pendingLabel="承認中…" size="small" aria-label={`${subject}を承認`}>
              承認
            </SubmitButton>
          </ActionForm>
          <Button
            type="button"
            variant="secondary"
            size="small"
            aria-label={`${subject}を補正して承認`}
            onClick={() => {
              setCorrectedLevel(null);
              setDialog("correct");
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            補正して承認
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="small"
            aria-label={`${subject}を差し戻し`}
            onClick={() => setDialog("reject")}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            差し戻し
          </Button>
        </div>
      </div>

      <CorrectionDialog
        row={row}
        subject={subject}
        open={dialog === "correct"}
        correctedLevel={correctedLevel}
        onLevelChange={setCorrectedLevel}
        onClose={closeDialog}
        onReviewed={handleReviewed}
      />
      <RejectionDialog
        row={row}
        subject={subject}
        open={dialog === "reject"}
        reason={rejectionReason}
        onReasonChange={setRejectionReason}
        onClose={closeDialog}
        onReviewed={handleReviewed}
      />
    </div>
  );
}

function CorrectionDialog({
  row,
  subject,
  open,
  correctedLevel,
  onLevelChange,
  onClose,
  onReviewed
}: {
  row: SkillApprovalRow;
  subject: string;
  open: boolean;
  correctedLevel: number | null;
  onLevelChange: (level: number) => void;
  onClose: () => void;
  onReviewed: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="補正して承認"
      description={`${row.memberName} / ${row.skillName}`}
    >
      <ActionForm action={reviewSkillAssessmentAction} onSuccess={onReviewed} className="space-y-4">
        <input type="hidden" name="assessmentId" value={row.id} />
        <input
          type="hidden"
          name="status"
          value={correctedLevel === row.requestedLevel ? statuses.approved : statuses.corrected}
        />
        <input type="hidden" name="correctedLevel" value={correctedLevel ?? ""} />
        <div>
          <p className="text-sm font-semibold">承認するレベルを選択</p>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label={`${subject}の補正レベル`}
          >
            {skillLevels.map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={correctedLevel === level}
                aria-label={`レベル${level}`}
                onClick={() => onLevelChange(level)}
                className={cn(
                  "h-11 min-w-11 rounded-md border px-3 text-sm font-semibold",
                  correctedLevel === level
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border-strong)]"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <TextareaField
          id={`correction-comment-${row.id}`}
          name="managerComment"
          label="マネージャーコメント（任意）"
          maxLength={1000}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <SubmitButton disabled={correctedLevel === null} pendingLabel="承認中…">
            このレベルで承認
          </SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}

function RejectionDialog({
  row,
  open,
  reason,
  onReasonChange,
  onClose,
  onReviewed
}: {
  row: SkillApprovalRow;
  subject: string;
  open: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onReviewed: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="申請を差し戻す"
      description={`${row.memberName} / ${row.skillName}`}
    >
      <ActionForm action={reviewSkillAssessmentAction} onSuccess={onReviewed} className="space-y-4">
        <input type="hidden" name="assessmentId" value={row.id} />
        <input type="hidden" name="status" value={statuses.rejected} />
        <TextareaField
          id={`rejection-reason-${row.id}`}
          name="managerComment"
          label="差し戻し理由"
          description="メンバーが次に取れる行動を具体的に記載してください。"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          required
          maxLength={1000}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <ConfirmSubmitButton
            disabled={!reason.trim()}
            pendingLabel="差し戻し中…"
            variant="destructive"
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
    </Dialog>
  );
}
