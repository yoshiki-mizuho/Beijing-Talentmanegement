"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";

import {
  deactivateMemberAction,
  removeMemberSkillAction,
  setMemberSkillLevelAction,
  updateMemberAction
} from "@/modules/members/presentation/actions";
import { getTrappedFocusIndex } from "@/modules/members/presentation/member-modal-focus";
import type {
  DepartmentOption,
  MemberRow,
  SkillOption
} from "@/modules/members/presentation/member-presentation-types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";

const memberStatuses = ["ACTIVE", "INACTIVE", "LEAVE"] as const;
const skillLevels = [1, 2, 3, 4, 5] as const;
const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MemberDetailModal({
  member,
  departments,
  skills,
  onClose
}: {
  member: MemberRow;
  departments: DepartmentOption[];
  skills: SkillOption[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `member-detail-title-${member.id}`;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector)
      );
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = getTrappedFocusIndex(
        currentIndex,
        focusable.length,
        event.shiftKey ? "backward" : "forward"
      );

      if (nextIndex >= 0) {
        event.preventDefault();
        focusable[nextIndex]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [member.id, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
              {member.employeeNo}
            </p>
            <h2 id={titleId} className="break-words text-lg font-semibold text-[var(--foreground)]">
              {member.name}の詳細
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="閉じる">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <section aria-labelledby={`${titleId}-basic`}>
            <h3 id={`${titleId}-basic`} className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              基本情報
            </h3>
            <form action={updateMemberAction} className="grid gap-3 md:grid-cols-3">
              <input type="hidden" name="id" value={member.id} />
              <Field id={`employeeNo-${member.id}`} label="社員番号" name="employeeNo" defaultValue={member.employeeNo} required />
              <Field id={`name-${member.id}`} label="氏名" name="name" defaultValue={member.name} required />
              <Field id={`email-${member.id}`} label="メール" name="email" type="email" defaultValue={member.email} required />
              <SelectField id={`department-${member.id}`} label="部署" name="departmentId" defaultValue={member.departmentId}>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </SelectField>
              <Field id={`jobTitle-${member.id}`} label="役職" name="jobTitle" defaultValue={member.jobTitle ?? ""} />
              <SelectField id={`status-${member.id}`} label="状態" name="status" defaultValue={member.status}>
                {memberStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </SelectField>
              <div className="md:col-span-3">
                <Label htmlFor={`profile-${member.id}`}>プロフィール</Label>
                <textarea
                  id={`profile-${member.id}`}
                  name="profile"
                  defaultValue={member.profile ?? ""}
                  className="mt-1 min-h-24 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]/20"
                />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-3">
                <Button type="submit">更新</Button>
                <Button type="submit" formAction={deactivateMemberAction} variant="secondary">
                  無効化
                </Button>
              </div>
            </form>
          </section>

          <section className="border-t border-[var(--border)] pt-5" aria-labelledby={`${titleId}-skills`}>
            <h3 id={`${titleId}-skills`} className="text-sm font-semibold text-[var(--foreground)]">保有スキル</h3>
            {member.memberSkills.length === 0 ? (
              <p className="mt-3 rounded-md bg-[var(--surface-subtle)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                保有スキルは未設定です。
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {member.memberSkills.map((memberSkill) => (
                  <div key={memberSkill.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-[var(--border)] p-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-[var(--foreground)]">{memberSkill.skill.name}</p>
                      <p className="break-words text-sm text-[var(--muted-foreground)]">
                        {memberSkill.skill.category.name} / Lv.{memberSkill.level}
                      </p>
                    </div>
                    <form action={removeMemberSkillAction}>
                      <input type="hidden" name="memberId" value={member.id} />
                      <input type="hidden" name="skillId" value={memberSkill.skillId} />
                      <Button type="submit" variant="ghost" size="icon" aria-label={`${memberSkill.skill.name}を削除`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <form action={setMemberSkillLevelAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
              <input type="hidden" name="memberId" value={member.id} />
              <Select name="skillId" aria-label="設定するスキル" required>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>{skill.category.name} / {skill.name}</option>
                ))}
              </Select>
              <Select name="level" aria-label="スキルレベル" required>
                {skillLevels.map((level) => (
                  <option key={level} value={level}>Lv.{level}</option>
                ))}
              </Select>
              <Button type="submit" className="w-full sm:w-auto">スキル設定</Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, name, ...props }: { id: string; label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} className="mt-1 w-full" {...props} />
    </div>
  );
}

function SelectField({ id, label, name, children, defaultValue }: { id: string; label: string; name: string; children: ReactNode; defaultValue?: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} name={name} defaultValue={defaultValue} className="mt-1">
        {children}
      </Select>
    </div>
  );
}