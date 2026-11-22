"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

import {
  removeMemberSkillAction,
  setMemberSkillLevelAction,
  updateMemberTargetRoleAction,
} from "@/modules/members/presentation/actions";
import {
  getMemberStatusLabel,
  sortMemberSkillsByLevel,
} from "@/modules/members/presentation/member-display";
import type {
  MemberRow,
  RoleOption,
  TargetRoleOption,
} from "@/modules/members/presentation/member-presentation-types";
import { ActionForm } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { SelectField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Tooltip } from "@/shared/ui/tooltip";

const skillLevels = [1, 2, 3, 4, 5] as const;

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
  const targetRoleEvaluation = targetRole
    ? evaluateRoleAchievement(
        targetRole.roleRequirements,
        member.memberSkills.map((skill) => ({ skillId: skill.skillId, level: skill.level })),
      )
    : null;
  const remainingSkillCount = targetRoleEvaluation
    ? targetRoleEvaluation.requiredCount - targetRoleEvaluation.satisfiedCount
    : 0;
  const targetRoleAchieved = member.targetRoleId !== null && member.roleAchievements.some(
    (achievement) => achievement.roleId === member.targetRoleId
  );

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
              <ReadOnlyField label="所属" value={member.organizationNode?.name ?? "所属なし"} />
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
                  {targetRoleAchieved ? (
                    <p className="flex items-center gap-1 font-semibold text-[var(--primary)]">
                      達成
                      {targetRoleEvaluation && !targetRoleEvaluation.achieved ? (
                        <Tooltip content="要件が更新されました">
                          <span tabIndex={0} aria-label="要件が更新されました">
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </Tooltip>
                      ) : null}
                    </p>
                  ) : (
                    <p>あと {remainingSkillCount} スキル</p>
                  )}
                  <Link
                    href={`/talent/roles?role=${encodeURIComponent(member.targetRole.id)}`}
                    className="inline-flex min-h-11 items-center font-semibold text-[var(--primary)] hover:underline"
                  >
                    ロールの詳細を見る
                  </Link>
                  {targetRoleEvaluation ? (
                    <div className="mt-2 space-y-2">
                      {targetRoleEvaluation.units.map((unit, index) => (
                        <div key={unit.kind === "single" ? unit.requirement.skillId : `group-${unit.group}`} className={unit.kind === "anyOf" ? "rounded-lg border border-dashed border-[var(--border)] p-2" : ""}>
                          {unit.kind === "anyOf" ? <p className="mb-1 text-xs font-semibold text-[var(--primary)]">いずれか1つ</p> : null}
                          {(unit.kind === "single" ? [unit.requirement] : unit.requirements).map((requirement) => (
                            <p key={`${index}-${requirement.skillId}`} className={`flex items-center gap-1 ${requirement.satisfied ? "text-[var(--primary)]" : ""}`}>
                              {requirement.satisfied ? <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">達成</span></> : null}{targetRole?.roleRequirements.find((item) => item.skillId === requirement.skillId)?.skill.name ?? requirement.skillId} Lv{requirement.requiredLevel}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
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
                    href="/talent/skill-approvals"
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
