"use client";

import {
  AlertTriangle,
  Check,
  CircleCheck,
  ChevronDown,
  ClipboardCheck,
  MessageCircle,
  Pencil,
  Undo2
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
import { ActionForm } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { TextareaField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Tooltip } from "@/shared/ui/tooltip";

const skillLevels = [1, 2, 3, 4, 5] as const;
const statuses = { approved: "APPROVED", corrected: "CORRECTED", rejected: "REJECTED" } as const;

export function SkillApprovalList({ rows }: { rows: SkillApprovalRow[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const visibleRows = rows.filter((row) => {
    if (filter === "with") return row.checkPoints.length > 0;
    if (filter === "without") return row.checkPoints.length === 0;
    return true;
  });
  const allSelected = visibleRows.length > 0
    && visibleRows.every((row) => selectedIds.has(row.id));
  const selectedCount = rows.filter((row) => selectedIds.has(row.id)).length;

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
  const selectRows = (ids: string[]) =>
    setSelectedIds((current) => new Set([...current, ...ids]));
  const toggleAll = () => {
    if (!allSelected) {
      selectRows(visibleRows.map((row) => row.id));
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleRows.forEach((row) => next.delete(row.id));
      return next;
    });
  };
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="確認ポイントで絞り込む">
            {([
              ["all", `すべて ${rows.length}`],
              ["with", `確認ポイントあり ${rows.filter((row) => row.checkPoints.length > 0).length}`],
              ["without", `確認ポイントなし ${rows.filter((row) => row.checkPoints.length === 0).length}`]
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "min-h-9 rounded-full px-4 text-sm font-semibold",
                  filter === value
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="secondary"
              aria-pressed={allSelected}
              onClick={toggleAll}
              className="w-full text-[13px] sm:w-auto"
            >
              {allSelected ? "すべて外す" : "すべて選ぶ"}
            </Button>
            <Button
              type="button"
              disabled={filter === "with"}
              onClick={() => selectRows(
                visibleRows
                  .filter((row) => row.checkPoints.length === 0)
                  .map((row) => row.id)
              )}
              className="w-full border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] text-[13px] text-[var(--primary)] hover:bg-[var(--primary-subtle)] sm:w-auto"
            >
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              確認ポイントなしをすべて選ぶ
            </Button>
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
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
        <div className="hidden min-w-[1140px] grid-cols-[40px_150px_120px_120px_64px_100px_minmax(120px,1fr)_340px] gap-2 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] lg:grid">
          <span>
            <span className="sr-only">選択</span>
          </span>
          <span>メンバー</span>
          <span>スキル</span>
          <span>レベル</span>
          <span>経験年数</span>
          <span>申請日</span>
          <span>確認ポイント</span>
          <span>操作</span>
        </div>
        <div
          className="divide-y divide-[var(--border)]"
          role="list"
          aria-label="承認待ちのスキル申請"
        >
          {visibleRows.map((row) => (
            <SkillApprovalItem
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              onSelectedChange={() => toggleOne(row.id)}
              onReviewed={() => removeSelection(row.id)}
            />
          ))}
        </div>
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
  const [expanded, setExpanded] = useState(false);
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
      className={cn(
        "grid gap-2 px-4 py-4 lg:min-w-[1140px] lg:grid-cols-[40px_150px_120px_120px_64px_100px_minmax(120px,1fr)_340px] lg:items-center",
        selected && "bg-[var(--primary-subtle)]"
      )}
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
          <p className="flex items-center gap-1 truncate text-sm font-semibold">
            {row.skillName}
            {row.applicantComment ? (
              <Tooltip content="ひとことあり">
                <span tabIndex={0} aria-label="ひとことあり">
                  <MessageCircle className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                </span>
              </Tooltip>
            ) : null}
          </p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{row.categoryName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 items-center gap-3 border-t border-[var(--border)] pt-3 lg:contents">
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
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${row.memberName}さんの ${row.skillName} の詳しい内容`}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-h-11 flex-col items-start justify-center gap-1 rounded-md text-left focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <span className="flex flex-wrap gap-1">
            {row.checkPoints.length === 0 ? (
              <span className="text-sm text-[var(--muted-foreground)]">確認ポイントなし</span>
            ) : row.checkPoints.map((point) => (
              <Badge key={`${point.type}-${point.detail}`} variant="warning">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {point.label}
              </Badge>
            ))}
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-[var(--primary)]">
            <ChevronDown
              className={cn("h-4 w-4", expanded && "rotate-180")}
              aria-hidden="true"
            />
            詳しく
          </span>
        </button>
        <div
          className={cn(
            // 1つ目はフォームに包まれているので、フォームも1列として扱う。
            "col-span-2 grid grid-cols-2 gap-2 lg:col-span-1 lg:grid-cols-3",
            "[&_button]:min-h-9 [&_button]:w-full [&_button]:whitespace-nowrap [&_button]:px-2 [&_button]:text-sm"
          )}
        >
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
            variant="secondary"
            size="small"
            className="text-[var(--destructive)]"
            aria-label={`${subject}を差し戻し`}
            onClick={() => setDialog("reject")}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            差し戻し
          </Button>
        </div>
      </div>

      {expanded ? <SkillApprovalDetails row={row} /> : null}

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

function SkillApprovalDetails({ row }: { row: SkillApprovalRow }) {
  const [distributionType, setDistributionType] = useState<"department" | "role">(
    "department"
  );
  const distribution = distributionType === "department"
    ? row.departmentDistribution
    : row.targetRoleDistribution;

  return (
    <div className="col-span-full grid gap-5 border-t border-[var(--border)] bg-[var(--surface-subtle)] p-4 lg:grid-cols-3">
      <section>
        <h3 className="text-sm font-semibold">確認ポイント</h3>
        {row.checkPoints.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm">
            {row.checkPoints.map((point) => (
              <li key={`${point.type}-${point.detail}`}>{point.detail}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">確認ポイントはありません。</p>
        )}
      </section>
      <section>
        <h3 className="text-sm font-semibold">レベルの分布</h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          申請を確かめるための参考です。評価には使いません。
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="small"
            variant={distributionType === "department" ? "primary" : "secondary"}
            aria-pressed={distributionType === "department"}
            onClick={() => setDistributionType("department")}
          >
            同じ部署
          </Button>
          {row.targetRoleDistribution ? (
            <Button
              type="button"
              size="small"
              variant={distributionType === "role" ? "primary" : "secondary"}
              aria-pressed={distributionType === "role"}
              onClick={() => setDistributionType("role")}
            >
              同じ目標ロール
            </Button>
          ) : null}
        </div>
        {distribution?.counts ? (
          <>
            <p className="mt-3 text-sm font-medium">
              {distributionType === "department"
                ? `${row.departmentName}の ${distribution.groupSize}人`
                : `${row.targetRoleName}を目標にしている ${distribution.groupSize}人`}
            </p>
            <LevelDistributionChart
              counts={distribution.counts}
              requestedLevel={row.requestedLevel}
            />
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              未登録 {distribution.unregisteredCount}人
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            人数が少ないため表示しません
          </p>
        )}
        {distribution?.counts ? (
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            本人を除く {distribution.groupSize}人。濃い色が申請のレベルです。名前は出しません。
          </p>
        ) : null}
      </section>
      <section>
        <h3 className="text-sm font-semibold">ひとこと</h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {row.applicantComment ?? "ひとことはありません。"}
        </p>
        <h3 className="mt-4 text-sm font-semibold">これまでの申請</h3>
        {row.history.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm">
            {row.history.map((item) => (
              <li key={item.id}>
                {item.dateLabel}・Lv{item.requestedLevel}・{item.resultLabel}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">過去の申請はありません。</p>
        )}
      </section>
    </div>
  );
}

function LevelDistributionChart({
  counts,
  requestedLevel
}: {
  counts: [number, number, number, number, number];
  requestedLevel: number;
}) {
  const maximum = Math.max(...counts, 1);
  const label = counts
    .map((count, index) => `Lv${index + 1}は${count}人`)
    .join("、");

  return (
    <div
      role="img"
      aria-label={`レベルの分布。${label}`}
      className="mt-3 flex h-32 items-end gap-2"
    >
      {counts.map((count, index) => {
        const level = index + 1;
        return (
          <div key={level} className="flex flex-1 flex-col items-center gap-1 text-xs">
            <span>{count}人</span>
            <span
              className={cn(
                "w-full rounded-t bg-[color-mix(in_srgb,var(--primary)_30%,var(--surface))]",
                level === requestedLevel && "bg-[var(--primary)]"
              )}
              style={{ height: `${Math.max(4, count / maximum * 80)}px` }}
            />
            <span>Lv{level}</span>
          </div>
        );
      })}
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
          <SubmitButton
            disabled={!reason.trim()}
            pendingLabel="差し戻し中…"
            variant="secondary"
            className="text-[var(--destructive)]"
          >
            差し戻す
          </SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}
