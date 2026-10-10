"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import {
  deactivateMemberAction,
  removeMemberSkillAction,
  setMemberSkillLevelAction,
  updateMemberAction,
  updateMemberManagerAction,
  updateMemberTargetRoleAction
} from "@/modules/members/presentation/actions";
import {
  getMemberStatusLabel,
  sortMemberSkillsByLevel
} from "@/modules/members/presentation/member-display";
import type {
  DepartmentOption,
  ManagerOption,
  MemberRow,
  SkillOption,
  TargetRoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { ActionForm } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Dialog } from "@/shared/ui/dialog";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";

const memberStatuses = ["ACTIVE", "LEAVE", "INACTIVE"] as const;
const skillLevels = [1, 2, 3, 4, 5] as const;
const detailTabs = [
  { id: "basic", label: "基本情報" },
  { id: "skills", label: "スキル" }
] as const;

type DetailTabId = (typeof detailTabs)[number]["id"];

export function MemberDetailModal({
  member,
  departments,
  skills,
  managerCandidates,
  targetRoles,
  canDeactivateMembers,
  canEditGrowthSettings,
  onClose,
  onMemberChanged
}: {
  member: MemberRow;
  departments: DepartmentOption[];
  skills: SkillOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
  onClose: () => void;
  onMemberChanged: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTabId>("basic");
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

      {activeTab === "basic" ? (
        <BasicInformationPanel
          member={member}
          departments={departments}
          managerCandidates={managerCandidates}
          targetRoles={targetRoles}
          canDeactivateMembers={canDeactivateMembers}
          canEditGrowthSettings={canEditGrowthSettings}
          onMemberChanged={onMemberChanged}
          panelId={`${titleId}-basic-panel`}
          tabId={`${titleId}-basic-tab`}
        />
      ) : (
        <MemberSkillsPanel
          member={member}
          skills={skills}
          onMemberChanged={onMemberChanged}
          panelId={`${titleId}-skills-panel`}
          tabId={`${titleId}-skills-tab`}
        />
      )}
    </Dialog>
  );
}

function BasicInformationPanel({
  member,
  departments,
  managerCandidates,
  targetRoles,
  canDeactivateMembers,
  canEditGrowthSettings,
  onMemberChanged,
  panelId,
  tabId
}: {
  member: MemberRow;
  departments: DepartmentOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
  onMemberChanged: () => void;
  panelId: string;
  tabId: string;
}) {
  const basicFormKey = [
    member.employeeNo,
    member.name,
    member.email,
    member.departmentId,
    member.jobTitle,
    member.status,
    member.profile
  ].join(":");

  return (
    <section
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="grid gap-5 md:grid-cols-3"
    >
      <ActionForm
        key={basicFormKey}
        action={updateMemberAction}
        className="contents"
        onSuccess={onMemberChanged}
      >
        <input type="hidden" name="id" value={member.id} />
        <FormField
          id={`employee-no-${member.id}`}
          label="社員番号"
          name="employeeNo"
          defaultValue={member.employeeNo}
          required
        />
        <FormField
          id={`member-name-${member.id}`}
          label="氏名"
          name="name"
          defaultValue={member.name}
          required
        />
        <FormField
          id={`member-email-${member.id}`}
          label="メール"
          name="email"
          type="email"
          defaultValue={member.email}
          required
        />
        <SelectField
          id={`member-department-${member.id}`}
          label="部署"
          name="departmentId"
          defaultValue={member.departmentId}
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </SelectField>
        <FormField
          id={`member-job-title-${member.id}`}
          label="役職"
          name="jobTitle"
          defaultValue={member.jobTitle ?? ""}
        />
        <SelectField
          id={`member-status-${member.id}`}
          label="状態"
          name="status"
          defaultValue={member.status}
        >
          {memberStatuses.map((status) => (
            <option key={status} value={status}>
              {getMemberStatusLabel(status)}
            </option>
          ))}
        </SelectField>
        <TextareaField
          id={`member-profile-${member.id}`}
          label="プロフィール"
          name="profile"
          defaultValue={member.profile ?? ""}
          className="md:col-span-3"
        />
        <div className="flex justify-end md:col-span-3">
          <SubmitButton pendingLabel="更新中…">基本情報を更新</SubmitButton>
        </div>
      </ActionForm>

      {canEditGrowthSettings ? (
        <>
          <ActionForm
            key={`manager-${member.managerId ?? "none"}`}
            action={updateMemberManagerAction}
            className="grid gap-3 md:col-span-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
            onSuccess={onMemberChanged}
          >
            <input type="hidden" name="memberId" value={member.id} />
            <SelectField
              id={`member-manager-${member.id}`}
              label="上司"
              name="managerId"
              defaultValue={member.managerId ?? ""}
            >
              <option value="">未設定</option>
              {managerCandidates
                .filter((candidate) => candidate.id !== member.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.employeeNo} / {candidate.name}
                  </option>
                ))}
            </SelectField>
            <SubmitButton pendingLabel="更新中…">上司を更新</SubmitButton>
          </ActionForm>
          <ActionForm
            key={`target-role-${member.targetRoleId ?? "none"}`}
            action={updateMemberTargetRoleAction}
            className="grid gap-3 md:col-span-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
            onSuccess={onMemberChanged}
          >
            <input type="hidden" name="memberId" value={member.id} />
            <SelectField
              id={`member-target-role-${member.id}`}
              label="目標ロール"
              name="targetRoleId"
              defaultValue={member.targetRoleId ?? ""}
            >
              <option value="">未設定</option>
              {targetRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </SelectField>
            <SubmitButton pendingLabel="更新中…">目標ロールを更新</SubmitButton>
          </ActionForm>
        </>
      ) : (
        <dl className="grid gap-3 md:col-span-3 md:grid-cols-2">
          <div className="rounded-md bg-[var(--surface-subtle)] px-3 py-2">
            <dt className="text-xs text-[var(--muted-foreground)]">上司</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">
              {member.manager?.name ?? "未設定"}
            </dd>
          </div>
          <div className="rounded-md bg-[var(--surface-subtle)] px-3 py-2">
            <dt className="text-xs text-[var(--muted-foreground)]">目標ロール</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">
              {member.targetRole?.name ?? "未設定"}
            </dd>
          </div>
        </dl>
      )}

      {canDeactivateMembers ? (
        <ActionForm
          action={deactivateMemberAction}
          className="border-t border-[var(--border)] pt-5 md:col-span-3"
          onSuccess={onMemberChanged}
          confirm={{
            title: "メンバーを無効化しますか",
            description: `「${member.name}」を無効化します。本人は業務機能を利用できなくなります。`,
            confirmLabel: "無効化する",
            destructive: true
          }}
        >
          <input type="hidden" name="id" value={member.id} />
          <SubmitButton
            pendingLabel="無効化中…"
            variant="destructive"
            disabled={member.status === "INACTIVE"}
          >
            {member.status === "INACTIVE" ? "無効化済み" : "無効化"}
          </SubmitButton>
        </ActionForm>
      ) : null}
    </section>
  );
}

function MemberSkillsPanel({
  member,
  skills,
  onMemberChanged,
  panelId,
  tabId
}: {
  member: MemberRow;
  skills: SkillOption[];
  onMemberChanged: () => void;
  panelId: string;
  tabId: string;
}) {
  const sortedMemberSkills = sortMemberSkillsByLevel(member.memberSkills);

  return (
    <section id={panelId} role="tabpanel" aria-labelledby={tabId}>
      {sortedMemberSkills.length === 0 ? (
        <p className="rounded-md bg-[var(--surface-subtle)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
          保有スキルは未設定です。下のフォームから最初のスキルを設定できます。
        </p>
      ) : (
        <div className="grid gap-2">
          {sortedMemberSkills.map((memberSkill) => (
            <div
              key={memberSkill.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border border-[var(--border)] p-3"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-[var(--foreground)]">
                  {memberSkill.skill.name}
                </p>
                <p className="break-words text-xs text-[var(--muted-foreground)]">
                  {memberSkill.skill.category.name}
                </p>
              </div>
              <Badge variant="primary">Lv.{memberSkill.level}</Badge>
              <ActionForm
                action={removeMemberSkillAction}
                onSuccess={onMemberChanged}
                confirm={{
                  title: "メンバーのスキルを削除しますか",
                  description: `「${memberSkill.skill.name}」を${member.name}の保有スキルから削除します。`,
                  confirmLabel: "削除する",
                  destructive: true
                }}
              >
                <input type="hidden" name="memberId" value={member.id} />
                <input type="hidden" name="skillId" value={memberSkill.skillId} />
                <SubmitButton
                  pendingLabel="削除中…"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11"
                  aria-label={`${memberSkill.skill.name}を削除`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </SubmitButton>
              </ActionForm>
            </div>
          ))}
        </div>
      )}
      <ActionForm
        action={setMemberSkillLevelAction}
        className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end"
        onSuccess={onMemberChanged}
      >
        <input type="hidden" name="memberId" value={member.id} />
        <SelectField
          id={`new-member-skill-${member.id}`}
          label="スキル"
          name="skillId"
          required
        >
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.category.name} / {skill.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          id={`new-member-skill-level-${member.id}`}
          label="レベル"
          name="level"
          required
        >
          {skillLevels.map((level) => (
            <option key={level} value={level}>
              Lv.{level}
            </option>
          ))}
        </SelectField>
        <SubmitButton pendingLabel="設定中…" className="w-full sm:w-auto">
          スキル設定
        </SubmitButton>
      </ActionForm>
    </section>
  );
}
