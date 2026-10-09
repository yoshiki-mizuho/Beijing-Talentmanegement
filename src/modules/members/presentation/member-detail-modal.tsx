"use client";

import { Trash2 } from "lucide-react";

import {
  deactivateMemberAction,
  removeMemberSkillAction,
  setMemberSkillLevelAction,
  updateMemberAction,
  updateMemberManagerAction,
  updateMemberTargetRoleAction
} from "@/modules/members/presentation/actions";
import type {
  DepartmentOption,
  ManagerOption,
  MemberRow,
  SkillOption,
  TargetRoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { ActionForm } from "@/shared/ui/action-form";
import { Dialog } from "@/shared/ui/dialog";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";

const memberStatuses = ["ACTIVE", "INACTIVE", "LEAVE"] as const;
const skillLevels = [1, 2, 3, 4, 5] as const;

export function MemberDetailModal({
  member,
  departments,
  skills,
  managerCandidates,
  targetRoles,
  canDeactivateMembers,
  canEditGrowthSettings,
  onClose
}: {
  member: MemberRow;
  departments: DepartmentOption[];
  skills: SkillOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
  onClose: () => void;
}) {
  const titleId = `member-detail-${member.id}`;

  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow={member.employeeNo}
      title={`${member.name}の詳細`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <section aria-labelledby={`${titleId}-basic`}>
          <h3
            id={`${titleId}-basic`}
            className="mb-3 text-sm font-semibold text-[var(--foreground)]"
          >
            基本情報
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <ActionForm action={updateMemberAction} className="contents">
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
                    {status === "ACTIVE"
                      ? "在籍中"
                      : status === "INACTIVE"
                        ? "退職・無効"
                        : "休職中"}
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
              <div className="md:col-span-3">
                <SubmitButton pendingLabel="更新中…">更新</SubmitButton>
              </div>
            </ActionForm>
            {canDeactivateMembers ? (
              <ActionForm
                action={deactivateMemberAction}
                className="md:col-span-3"
                confirm={{
                  title: "メンバーを無効化しますか",
                  description: `「${member.name}」を無効化します。本人は業務機能を利用できなくなります。`,
                  confirmLabel: "無効化する",
                  destructive: true
                }}
              >
                <input type="hidden" name="id" value={member.id} />
                <SubmitButton pendingLabel="無効化中…" variant="destructive">
                  無効化
                </SubmitButton>
              </ActionForm>
            ) : null}
            {canEditGrowthSettings ? (
              <>
                <ActionForm
                  action={updateMemberManagerAction}
                  className="grid gap-3 md:col-span-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
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
                  action={updateMemberTargetRoleAction}
                  className="grid gap-3 md:col-span-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
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
                      <option key={role.id} value={role.id}>{role.name}</option>
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
          </div>
        </section>

        <section
          className="border-t border-[var(--border)] pt-5"
          aria-labelledby={`${titleId}-skills`}
        >
          <h3
            id={`${titleId}-skills`}
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            保有スキル
          </h3>
          {member.memberSkills.length === 0 ? (
            <p className="mt-3 rounded-md bg-[var(--surface-subtle)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
              保有スキルは未設定です。
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {member.memberSkills.map((memberSkill) => (
                <div
                  key={memberSkill.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-[var(--border)] p-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-[var(--foreground)]">
                      {memberSkill.skill.name}
                    </p>
                    <p className="break-words text-sm text-[var(--muted-foreground)]">
                      {memberSkill.skill.category.name} / Lv.{memberSkill.level}
                    </p>
                  </div>
                  <ActionForm
                    action={removeMemberSkillAction}
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
            className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end"
          >
            <input type="hidden" name="memberId" value={member.id} />
            <SelectField
              id={`new-member-skill-${member.id}`}
              label="設定するスキル"
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
                <option key={level} value={level}>Lv.{level}</option>
              ))}
            </SelectField>
            <SubmitButton pendingLabel="設定中…" className="w-full sm:w-auto">
              スキル設定
            </SubmitButton>
          </ActionForm>
        </section>
      </div>
    </Dialog>
  );
}
