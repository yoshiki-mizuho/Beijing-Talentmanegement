"use client";

import { UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import type { Route } from "next";
import { GrowthHintPanel } from "@/modules/ai-evaluation/presentation/growth-hint-panel";

import {
  createOneOnOneNoteAction,
  listOneOnOneNotesAction,
  toggleOneOnOneNoteDiscussedAction,
  updateOneOnOneNoteAction
} from "@/modules/growth/presentation/actions";

import type {
  DepartmentOption,
  ManagerOption,
  MemberRow,
  RoleOption,
  SkillOption,
  TargetRoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { ActionForm } from "@/shared/ui/action-form";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { TextareaField } from "@/shared/ui/form-field";
import { Button } from "@/shared/ui/button";
import { SubmitButton } from "@/shared/ui/submit-button";
import {
  MemberAccountPanel,
  MemberOverviewPanel
} from "@/modules/members/presentation/member-detail-panels";

type DetailTabId = "overview" | "growth-hint" | "one-on-one" | "account";

export function MemberDetailModal({
  member,
  departments,
  managerCandidates,
  targetRoles,
  roles,
  canEditGrowthSettings,
  viewerMemberId,
  onClose,
  onMemberChanged
}: {
  member: MemberRow;
  departments: DepartmentOption[];
  skills: SkillOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  roles: RoleOption[];
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
  viewerMemberId: string;
  onClose: () => void;
  onMemberChanged: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTabId>("overview");
  const detailTabs: Array<{ id: DetailTabId; label: string }> = [
    { id: "overview", label: "概要" },
    { id: "growth-hint", label: "育成のヒント" },
    ...(member.managerId === viewerMemberId ? [{ id: "one-on-one" as const, label: "1on1 メモ" }] : []),
    ...(canEditGrowthSettings ? [{ id: "account" as const, label: "アカウント" }] : [])
  ];
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const titleId = `member-detail-${member.id}`;

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % detailTabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + detailTabs.length) % detailTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = detailTabs.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = detailTabs[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow={member.employeeNo}
      title={`${member.name}の詳細`}
      className="max-w-4xl"
      headerActions={(
        <Link
          href={`/people/${member.id}` as Route}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <UserRound className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">プロフィールを見る</span>
        </Link>
      )}
    >
      <div
        role="tablist"
        aria-label={`${member.name}の詳細項目`}
        className="mb-5 flex gap-1 border-b border-[var(--border)]"
      >
        {detailTabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`${titleId}-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${titleId}-${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className="min-h-11 border-b-2 border-transparent px-4 text-sm font-semibold text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] data-[selected=true]:border-[var(--primary)] data-[selected=true]:text-[var(--primary)]"
            data-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <MemberOverviewPanel
          member={member}
          targetRoles={targetRoles}
          roles={roles}
          onMemberChanged={onMemberChanged}
          panelId={`${titleId}-overview-panel`}
          tabId={`${titleId}-overview-tab`}
        />
      ) : activeTab === "growth-hint" ? (
        <GrowthHintPanel
          memberId={member.id}
          panelId={`${titleId}-growth-hint-panel`}
          tabId={`${titleId}-growth-hint-tab`}
          onGenerated={onMemberChanged}
        />
      ) : activeTab === "one-on-one" ? (
        <OneOnOneNotesPanel memberId={member.id} panelId={`${titleId}-one-on-one-panel`} tabId={`${titleId}-one-on-one-tab`} />
      ) : (
        <MemberAccountPanel
          member={member}
          departments={departments}
          managerCandidates={managerCandidates}
          viewerMemberId={viewerMemberId}
          onMemberChanged={onMemberChanged}
          panelId={`${titleId}-account-panel`}
          tabId={`${titleId}-account-tab`}
        />
      )}
    </Dialog>
  );
}

type OneOnOneNoteView = Awaited<ReturnType<typeof listOneOnOneNotesAction>>[number];

function OneOnOneNotesPanel({ memberId, panelId, tabId }: { memberId: string; panelId: string; tabId: string }) {
  const [notes, setNotes] = useState<OneOnOneNoteView[]>([]);
  const [loading, setLoading] = useState(true);
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try { setNotes(await listOneOnOneNotesAction(memberId)); } finally { setLoading(false); }
  }, [memberId]);
  useEffect(() => {
    let active = true;
    listOneOnOneNotesAction(memberId).then((items) => {
      if (!active) return;
      setNotes(items);
      setLoading(false);
    });
    return () => { active = false; };
  }, [memberId]);

  return (
    <section id={panelId} role="tabpanel" aria-labelledby={tabId} className="space-y-5">
      <ActionForm action={createOneOnOneNoteAction} className="space-y-3" onSuccess={() => void loadNotes()}>
        <input type="hidden" name="memberId" value={memberId} />
        <TextareaField id={`one-on-one-new-${memberId}`} label="メモを追加" name="body" maxLength={500} required />
        <div className="flex justify-end"><SubmitButton pendingLabel="追加中…">追加する</SubmitButton></div>
      </ActionForm>
      {loading ? <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">読み込み中…</p> : notes.length === 0 ? (
        <EmptyState title="1on1 メモはまだありません" />
      ) : (
        <ul className="space-y-3 border-t border-[var(--border)] pt-5">
          {notes.map((note) => (
            <OneOnOneNoteItem key={note.id} note={note} onChanged={() => void loadNotes()} />
          ))}
        </ul>
      )}
    </section>
  );
}

// 普段は読みやすい文章で表示し、「編集」を押したときだけ入力欄にする
function OneOnOneNoteItem({ note, onChanged }: { note: OneOnOneNoteView; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const discussed = note.discussedAt !== null;

  return (
    <li className="rounded-lg border border-[var(--border)] px-4 py-2">
      {editing ? (
        <ActionForm
          action={updateOneOnOneNoteAction}
          className="space-y-3 py-2"
          onSuccess={() => {
            setEditing(false);
            onChanged();
          }}
        >
          <input type="hidden" name="id" value={note.id} />
          <textarea name="body" aria-label="1on1 メモ" defaultValue={note.body} maxLength={500} required autoFocus className="min-h-20 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>キャンセル</Button>
            <SubmitButton pendingLabel="保存中…">保存</SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <div className="flex items-start gap-3">
          <ActionForm action={toggleOneOnOneNoteDiscussedAction} onSuccess={onChanged}>
            <input type="hidden" name="id" value={note.id} />
            <label className="grid min-h-11 min-w-11 cursor-pointer place-items-center">
              <input type="checkbox" aria-label="話した" checked={discussed} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="h-4 w-4" />
            </label>
          </ActionForm>
          <div className={`min-w-0 flex-1 py-2.5 ${discussed ? "text-[var(--muted-foreground)]" : ""}`}>
            <p className={`whitespace-pre-wrap break-words text-sm ${discussed ? "line-through" : ""}`}>{note.body}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {discussed && note.discussedAt ? `話した日：${formatOneOnOneDate(note.discussedAt)}` : formatOneOnOneDate(note.createdAt)}
            </p>
          </div>
          <Button type="button" variant="ghost" className="min-h-11 shrink-0" onClick={() => setEditing(true)}>編集</Button>
        </div>
      )}
    </li>
  );
}

function formatOneOnOneDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(new Date(value));
}

