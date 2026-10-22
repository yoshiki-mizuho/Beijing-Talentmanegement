"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  deactivateMemberAction,
  issueInitialPasswordAction,
  removeMemberSkillAction,
  setMemberSkillLevelAction,
  updateMemberAction,
  updateMemberManagerAction,
  updateMemberRoleAction,
  updateMemberTargetRoleAction,
} from "@/modules/members/presentation/actions";
import {
  getMemberStatusLabel,
  sortMemberSkillsByLevel,
} from "@/modules/members/presentation/member-display";
import type {
  DepartmentOption,
  ManagerOption,
  MemberRow,
  RoleOption,
  TargetRoleOption,
} from "@/modules/members/presentation/member-presentation-types";
import { ActionForm } from "@/shared/ui/action-form";
import type { ActionResult } from "@/shared/lib/action-result";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";
import { InitialPasswordNotice } from "@/modules/members/presentation/initial-password-notice";

const memberStatuses = ["ACTIVE", "LEAVE", "INACTIVE"] as const;
const skillLevels = [1, 2, 3, 4, 5] as const;
const roleLabels = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  MEMBER: "メンバー",
} as const;

type PanelProps = {
  member: MemberRow;
  targetRoles: TargetRoleOption[];
  roles: RoleOption[];
  onMemberChanged: () => void;
  panelId: string;
  tabId: string;
};

export function MemberOverviewPanel({
  member,
  targetRoles,
  roles,
  onMemberChanged,
  panelId,
  tabId,
}: PanelProps) {
  const sortedSkills = sortMemberSkillsByLevel(member.memberSkills);
  const pendingBySkill = new Map(
    (member.pendingAssessments ?? []).map((assessment) => [
      assessment.skillId,
      assessment.requestedLevel,
    ]),
  );
  // まだ持っていないスキルの申請は、承認済みの行がないので別の行として出す
  const ownedSkillIds = new Set(
    member.memberSkills.map((memberSkill) => memberSkill.skillId),
  );
  const pendingNewSkills = (member.pendingAssessments ?? []).filter(
    (assessment) => !ownedSkillIds.has(assessment.skillId),
  );
  const targetRole = roles.find((role) => role.id === member.targetRoleId);
  const levels = new Map(
    member.memberSkills.map((memberSkill) => [
      memberSkill.skillId,
      memberSkill.level,
    ]),
  );
  const remainingSkillCount =
    targetRole?.roleRequirements.filter(
      (requirement) =>
        requirement.isRequired &&
        (levels.get(requirement.skillId) ?? 0) < requirement.requiredLevel,
    ).length ?? 0;

  return (
    <section
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
    >
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>
              基本情報の変更は ADMIN が行います。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="部署" value={member.department.name} />
              <ReadOnlyField label="役職" value={member.jobTitle ?? "未設定"} />
              <ReadOnlyField
                label="上司"
                value={member.manager?.name ?? "未設定"}
              />
              <ReadOnlyField
                label="状態"
                value={getMemberStatusLabel(member.status)}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>目標ロール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">
                {member.targetRole?.name ?? "未設定"}
              </p>
              {member.targetRole ? (
                <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                  <p>あと {remainingSkillCount} スキル</p>
                  <Link
                    href={`/roles?role=${encodeURIComponent(member.targetRole.id)}`}
                    className="inline-flex min-h-11 items-center font-semibold text-[var(--primary)] hover:underline"
                  >
                    ロールの詳細を見る
                  </Link>
                </div>
              ) : null}
            </div>
            <ActionForm
              key={member.targetRoleId ?? "none"}
              action={updateMemberTargetRoleAction}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
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
              <SubmitButton pendingLabel="変更中…">変更</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>スキル</CardTitle>
          <CardDescription>
            承認済み {sortedSkills.length}件・承認待ち{" "}
            {member.pendingAssessments?.length ?? 0}件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingNewSkills.length > 0 ? (
            <div className="divide-y divide-[var(--border)] rounded-md border border-amber-200 bg-amber-50 px-3">
              {pendingNewSkills.map((assessment) => (
                <div
                  key={assessment.skillId}
                  className="flex min-h-11 items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">
                      {assessment.skill.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {assessment.skill.category.name}
                    </p>
                  </div>
                  <Badge>未登録 → Lv{assessment.requestedLevel} を申請中</Badge>
                  <Link
                    href="/skill-approvals"
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)] hover:underline"
                  >
                    承認画面へ
                  </Link>
                </div>
              ))}
            </div>
          ) : null}
          {sortedSkills.length === 0 ? (
            <p className="rounded-md bg-[var(--surface-subtle)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
              承認済みのスキルはありません。
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {sortedSkills.map((memberSkill) => (
                <EditableSkillRow
                  key={memberSkill.id}
                  member={member}
                  memberSkill={memberSkill}
                  pendingLevel={pendingBySkill.get(memberSkill.skillId)}
                  onMemberChanged={onMemberChanged}
                />
              ))}
            </div>
          )}
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">
            レベルは本人の申請と承認で変わります。「訂正」は登録の誤りを直すときだけ使います（記録に残ります）。
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-subtle)] px-3 py-2">
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function EditableSkillRow({
  member,
  memberSkill,
  pendingLevel,
  onMemberChanged,
}: {
  member: MemberRow;
  memberSkill: MemberRow["memberSkills"][number];
  pendingLevel: number | undefined;
  onMemberChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex min-h-11 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium">
            {memberSkill.skill.name}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {memberSkill.skill.category.name}
          </p>
        </div>
        {pendingLevel ? <Badge>Lv{pendingLevel} を申請中</Badge> : null}
        <Badge variant="primary">Lv.{memberSkill.level}</Badge>
        <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
          訂正
        </Button>
      </div>
      {editing ? (
        <div className="mt-3 rounded-md bg-[var(--surface-subtle)] p-3">
          <ActionForm
            action={setMemberSkillLevelAction}
            onSuccess={() => {
              setEditing(false);
              onMemberChanged();
            }}
          >
            <input type="hidden" name="memberId" value={member.id} />
            <input type="hidden" name="skillId" value={memberSkill.skillId} />
            <fieldset>
              <legend className="text-xs font-semibold">訂正後のレベル</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {skillLevels.map((level) => (
                  <label
                    key={level}
                    className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-md border border-[var(--border-strong)] bg-[var(--surface)] text-sm has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)] has-[:checked]:font-semibold"
                  >
                    <input
                      type="radio"
                      name="level"
                      value={level}
                      defaultChecked={level === memberSkill.level}
                      className="sr-only"
                    />
                    {level}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                キャンセル
              </Button>
              <SubmitButton pendingLabel="訂正中…">訂正する</SubmitButton>
            </div>
          </ActionForm>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <ActionForm
              action={removeMemberSkillAction}
              onSuccess={onMemberChanged}
              confirm={{
                title: "このスキルを外しますか",
                description: `「${memberSkill.skill.name}」を${member.name}さんの保有スキルから外します。`,
                confirmLabel: "外す",
                destructive: true,
              }}
            >
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="skillId" value={memberSkill.skillId} />
              <SubmitButton variant="ghost" pendingLabel="処理中…">
                このスキルを外す
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MemberAccountPanel({
  member,
  departments,
  managerCandidates,
  viewerMemberId,
  onMemberChanged,
  panelId,
  tabId,
}: {
  member: MemberRow;
  departments: DepartmentOption[];
  managerCandidates: ManagerOption[];
  viewerMemberId: string;
  onMemberChanged: () => void;
  panelId: string;
  tabId: string;
}) {
  const [selectedRole, setSelectedRole] = useState(member.role ?? "MEMBER");
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);

  return (
    <section
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="space-y-5"
    >
      <Card>
        <CardHeader>
          <CardTitle>基本情報の編集</CardTitle>
          <CardDescription>CSV の取り込みでも更新できます。</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm
            key={member.id}
            action={updateMemberAction}
            className="grid gap-4 md:grid-cols-3"
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
              <SubmitButton pendingLabel="保存中…">基本情報を保存</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>上司</CardTitle>
            <CardDescription>承認依頼が届く相手です。</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              key={member.managerId ?? "none"}
              action={updateMemberManagerAction}
              className="space-y-3"
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>権限</CardTitle>
            <CardDescription>画面と操作の範囲が変わります。</CardDescription>
          </CardHeader>
          <CardContent>
            {member.role ? (
              <ActionForm
                key={member.role}
                action={updateMemberRoleAction}
                className="space-y-3"
                onSuccess={onMemberChanged}
                confirm={{
                  title: "権限を変更しますか",
                  description: `${member.name}さんの権限を ${roleLabels[member.role]} → ${roleLabels[selectedRole]} に変更します。`,
                  confirmLabel: "変更する",
                }}
              >
                <input type="hidden" name="memberId" value={member.id} />
                <SelectField
                  id={`member-permission-${member.id}`}
                  label="権限"
                  name="role"
                  value={selectedRole}
                  disabled={member.id === viewerMemberId}
                  onChange={(event) =>
                    setSelectedRole(
                      event.target.value as keyof typeof roleLabels,
                    )
                  }
                >
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ))}
                </SelectField>
                <SubmitButton
                  pendingLabel="変更中…"
                  disabled={
                    member.id === viewerMemberId || selectedRole === member.role
                  }
                >
                  変更
                </SubmitButton>
              </ActionForm>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>初回ログイン用のパスワード</CardTitle>
          <CardDescription>
            発行すると、今のパスワードは使えなくなります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {member.id === viewerMemberId ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              自分自身には発行できません。
            </p>
          ) : issuedPassword ? (
            <InitialPasswordNotice
              email={member.email}
              initialPassword={issuedPassword}
            />
          ) : (
            <ActionForm
              action={issueInitialPasswordAction}
              onSuccess={(result: ActionResult) =>
                setIssuedPassword(
                  (result.data as { initialPassword: string }).initialPassword,
                )
              }
              confirm={{
                title: "初回ログイン用のパスワードを発行しますか",
                description: "今のパスワードは使えなくなります。",
                confirmLabel: "発行する",
              }}
            >
              <input type="hidden" name="memberId" value={member.id} />
              <SubmitButton pendingLabel="発行中…">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                パスワードを発行
              </SubmitButton>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--destructive)]">
        <CardHeader>
          <CardTitle>無効化</CardTitle>
          <CardDescription>
            退職などでログインできなくします。記録は残ります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={deactivateMemberAction}
            onSuccess={onMemberChanged}
            confirm={{
              title: "メンバーを無効化しますか",
              description: `「${member.name}」を無効化します。本人は業務機能を利用できなくなります。`,
              confirmLabel: "無効化する",
              destructive: true,
            }}
          >
            <input type="hidden" name="id" value={member.id} />
            <SubmitButton
              pendingLabel="無効化中…"
              variant="destructive"
              disabled={
                member.id === viewerMemberId || member.status === "INACTIVE"
              }
            >
              {member.status === "INACTIVE" ? "無効化済み" : "無効化"}
            </SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </section>
  );
}
