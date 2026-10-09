"use client";

import { ListChecks, Plus, Target, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createRoleAction,
  deactivateRoleAction,
  removeRoleRequirementAction,
  setRoleRequirementAction,
  updateRoleAction
} from "@/modules/roles/presentation/actions";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";

const skillLevels = [1, 2, 3, 4, 5] as const;

type RoleItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requirements: {
    id: string;
    skillId: string;
    requiredLevel: number;
    isRequired: boolean;
    skill: {
      name: string;
      categoryName: string;
    };
  }[];
  memberStatuses: {
    id: string;
    name: string;
    departmentName: string;
    jobTitle: string | null;
    achieved: boolean;
    achievementRate: number;
    missingRequirements: {
      skillId: string;
      skillName: string;
      requiredLevel: number;
      memberLevel: number | null;
    }[];
  }[];
  achievedMemberCount: number;
};

type SkillOption = {
  id: string;
  name: string;
  categoryName: string;
};

export function RoleManagement({
  roles,
  skills,
  canManage
}: {
  roles: RoleItem[];
  skills: SkillOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <PageHeader
        title="ロール管理"
        description="ロール要件を管理し、メンバーごとの達成状況を確認します。"
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              新規ロール
            </Button>
          ) : undefined
        }
      />

      {roles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="ロールがありません"
            description={
              canManage
                ? "新規ロールを追加し、必要なスキルを設定してください。"
                : "確認できるロールはまだありません。"
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const requiredCount = role.requirements.filter(
              (requirement) => requirement.isRequired
            ).length;
            const optionalCount = role.requirements.length - requiredCount;

            return (
              <Card key={role.id} className="flex min-h-64 flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <Badge variant={role.isActive ? "success" : "neutral"}>
                      {role.isActive ? "有効" : "無効"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-3">
                    {role.description ?? "説明未設定"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                      <dt className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                        要件
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        必須 {requiredCount}・任意 {optionalCount}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                      <dt className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <UsersRound className="h-4 w-4" aria-hidden="true" />
                        達成者
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        {role.achievedMemberCount}人 / {role.memberStatuses.length}人
                      </dd>
                    </div>
                  </dl>
                  <Button
                    variant={canManage ? "secondary" : "primary"}
                    className="w-full min-h-11"
                    onClick={() => setSelectedRoleId(role.id)}
                    aria-label={`${role.name}の${canManage ? "編集" : "詳細"}を開く`}
                  >
                    {canManage ? "編集" : "詳細"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {canManage ? (
        <Dialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="新規ロール"
          description="ロールを追加した後、編集画面から要件を設定できます。"
        >
          <ActionForm
            action={createRoleAction}
            className="space-y-4"
            onSuccess={() => {
              setCreateOpen(false);
              refresh();
            }}
          >
            <FormField
              id="create-role-name"
              label="ロール名"
              name="name"
              required
            />
            <TextareaField
              id="create-role-description"
              label="説明"
              name="description"
            />
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-4 w-4 accent-[var(--primary)]"
              />
              有効
            </label>
            <div className="flex justify-end">
              <SubmitButton pendingLabel="登録中…">ロールを登録</SubmitButton>
            </div>
          </ActionForm>
        </Dialog>
      ) : null}

      {selectedRole ? (
        <RoleDetailDialog
          role={selectedRole}
          skills={skills}
          canManage={canManage}
          onClose={() => setSelectedRoleId(null)}
          onRefresh={refresh}
          onDeactivate={() => {
            setSelectedRoleId(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function RoleDetailDialog({
  role,
  skills,
  canManage,
  onClose,
  onRefresh,
  onDeactivate
}: {
  role: RoleItem;
  skills: SkillOption[];
  canManage: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onDeactivate: () => void;
}) {
  const existingSkillIds = new Set(
    role.requirements.map((requirement) => requirement.skillId)
  );
  const availableSkills = skills.filter((skill) => !existingSkillIds.has(skill.id));

  return (
    <Dialog
      open
      onClose={onClose}
      title={role.name}
      description={role.description ?? "説明未設定"}
      className="max-w-4xl"
    >
      <div className="space-y-8">
        {canManage ? (
          <section aria-labelledby={`role-settings-${role.id}`} className="space-y-4">
            <h3
              id={`role-settings-${role.id}`}
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              基本情報
            </h3>
            <ActionForm
              action={updateRoleAction}
              className="grid gap-4 md:grid-cols-2"
              onSuccess={onRefresh}
            >
              <input type="hidden" name="id" value={role.id} />
              <FormField
                id={`edit-role-name-${role.id}`}
                label="ロール名"
                name="name"
                defaultValue={role.name}
                required
              />
              <TextareaField
                id={`edit-role-description-${role.id}`}
                label="説明"
                name="description"
                defaultValue={role.description ?? ""}
                className="md:col-span-2"
              />
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={role.isActive}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                有効
              </label>
              <div className="flex items-center justify-end">
                <SubmitButton pendingLabel="保存中…">基本情報を保存</SubmitButton>
              </div>
            </ActionForm>
            <ActionForm action={deactivateRoleAction} onSuccess={onDeactivate}>
              <input type="hidden" name="id" value={role.id} />
              <ConfirmSubmitButton
                pendingLabel="無効化中…"
                variant="destructive"
                disabled={!role.isActive}
                confirm={{
                  title: "ロールを無効化しますか",
                  description: `「${role.name}」を無効化します。設定済みの要件は保持されます。`,
                  confirmLabel: "無効化する",
                  destructive: true
                }}
              >
                ロールを無効化
              </ConfirmSubmitButton>
            </ActionForm>
          </section>
        ) : null}

        <section
          aria-labelledby={`role-requirements-${role.id}`}
          className="space-y-4 border-t border-[var(--border)] pt-6"
        >
          <div>
            <h3
              id={`role-requirements-${role.id}`}
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              要件
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              必須スキルと、成長の目安となる任意の推奨スキルです。
            </p>
          </div>

          {role.requirements.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="要件がありません"
              description={
                canManage
                  ? "このロールに必要なスキルを追加してください。"
                  : "このロールにはまだ要件が設定されていません。"
              }
            />
          ) : (
            <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {role.requirements.map((requirement) => (
                <div
                  key={requirement.id}
                  role="group"
                  aria-label={`${requirement.skill.name}のロール要件`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--foreground)]">
                        {requirement.skill.name}
                      </p>
                      <Badge variant={requirement.isRequired ? "primary" : "neutral"}>
                        {requirement.isRequired ? "必須" : "任意"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {requirement.skill.categoryName} / 必要レベル {requirement.requiredLevel}
                    </p>
                  </div>
                  {canManage ? (
                    <ActionForm
                      action={removeRoleRequirementAction}
                      onSuccess={onRefresh}
                    >
                      <input type="hidden" name="roleId" value={role.id} />
                      <input
                        type="hidden"
                        name="skillId"
                        value={requirement.skillId}
                      />
                      <ConfirmSubmitButton
                        pendingLabel="削除中…"
                        variant="destructive"
                        confirm={{
                          title: "ロール要件を削除しますか",
                          description: `「${requirement.skill.name}」を要件から削除します。`,
                          confirmLabel: "削除する",
                          destructive: true
                        }}
                      >
                        削除
                      </ConfirmSubmitButton>
                    </ActionForm>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {canManage ? (
            availableSkills.length === 0 ? (
              <p className="rounded-lg bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted-foreground)]">
                追加できる有効なスキルはありません。既に要件にあるスキルは候補から除外されています。
              </p>
            ) : (
              <ActionForm
                action={setRoleRequirementAction}
                className="grid gap-3 rounded-lg bg-[var(--surface-subtle)] p-4 md:grid-cols-[minmax(0,1fr)_9rem_8rem_auto] md:items-end"
                onSuccess={onRefresh}
              >
                <input type="hidden" name="roleId" value={role.id} />
                <SelectField
                  id={`add-requirement-skill-${role.id}`}
                  label="追加するスキル"
                  name="skillId"
                  required
                >
                  {availableSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.categoryName} / {skill.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  id={`add-requirement-level-${role.id}`}
                  label="必要レベル"
                  name="requiredLevel"
                  required
                >
                  {skillLevels.map((level) => (
                    <option key={level} value={level}>
                      レベル {level}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  id={`add-requirement-type-${role.id}`}
                  label="区分"
                  name="isRequired"
                  defaultValue="true"
                  required
                >
                  <option value="true">必須</option>
                  <option value="false">任意</option>
                </SelectField>
                <SubmitButton pendingLabel="追加中…">要件を追加</SubmitButton>
              </ActionForm>
            )
          ) : null}
        </section>

        <section
          aria-labelledby={`role-achievement-${role.id}`}
          className="space-y-4 border-t border-[var(--border)] pt-6"
        >
          <div>
            <h3
              id={`role-achievement-${role.id}`}
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              達成状況
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              達成判定は必須要件のみを対象にしています。
            </p>
          </div>

          {role.memberStatuses.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="メンバーがいません"
              description="メンバーが登録されると、ここに達成状況が表示されます。"
            />
          ) : (
            <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {role.memberStatuses.map((member) => (
                <div key={member.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {member.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {member.departmentName} / {member.jobTitle ?? "役職未設定"}
                      </p>
                    </div>
                    <Badge variant={member.achieved ? "success" : "warning"}>
                      {member.achieved ? "達成" : "未達"} /{" "}
                      {Math.round(member.achievementRate * 100)}%
                    </Badge>
                  </div>
                  {member.missingRequirements.length > 0 ? (
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      不足スキル:{" "}
                      {member.missingRequirements
                        .map(
                          (requirement) =>
                            `${requirement.skillName} レベル${requirement.memberLevel ?? 0}/${requirement.requiredLevel}`
                        )
                        .join("、")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Dialog>
  );
}
