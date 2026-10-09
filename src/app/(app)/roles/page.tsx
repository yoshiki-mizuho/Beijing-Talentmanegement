import { listMembers } from "@/modules/members/application/member-service";
import {
  evaluateMemberForRole,
  listRoles
} from "@/modules/roles/application/role-service";
import {
  createRoleAction,
  deactivateRoleAction,
  removeRoleRequirementAction,
  setRoleRequirementAction,
  updateRoleAction
} from "@/modules/roles/presentation/actions";
import { canManageRoles } from "@/modules/roles/presentation/role-permissions";
import { listSkills } from "@/modules/skills/application/skill-service";
import { ActionForm } from "@/shared/ui/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, SelectField } from "@/shared/ui/form-field";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";
import { managerOrAdmin, requireRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

const skillLevels = [1, 2, 3, 4, 5] as const;

export default async function RolesPage() {
  const session = await requireRoles(managerOrAdmin);
  const canManage = canManageRoles(session.user.role);
  const [roles, skills, members] = await Promise.all([
    listRoles(),
    listSkills(),
    listMembers()
  ]);
  const activeSkills = skills.filter((skill) => skill.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ロール管理"
        description="ロール要件を管理し、メンバーごとの達成状況を確認します。"
      />

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>新規ロール</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createRoleAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
              <FormField id="new-role-name" label="ロール名" name="name" required />
              <FormField id="new-role-description" label="説明" name="description" />
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                <input type="checkbox" name="isActive" defaultChecked />
                有効
              </label>
              <div className="self-end">
                <SubmitButton pendingLabel="登録中…">登録</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {roles.map((role) => {
          const requirements = role.roleRequirements.map((requirement) => ({
            skillId: requirement.skillId,
            requiredLevel: requirement.requiredLevel,
            isRequired: true,
            skillName: requirement.skill.name
          }));

          return (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle>{role.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {canManage ? (
                  <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto_auto]">
                    <ActionForm action={updateRoleAction} className="contents">
                      <input type="hidden" name="id" value={role.id} />
                      <FormField
                        id={`role-name-${role.id}`}
                        label="ロール名"
                        name="name"
                        defaultValue={role.name}
                        required
                      />
                      <FormField
                        id={`role-description-${role.id}`}
                        label="説明"
                        name="description"
                        defaultValue={role.description ?? ""}
                      />
                      <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                        <input type="checkbox" name="isActive" defaultChecked={role.isActive} />
                        有効
                      </label>
                      <div className="self-end">
                        <SubmitButton pendingLabel="更新中…">更新</SubmitButton>
                      </div>
                    </ActionForm>
                    <ActionForm
                      action={deactivateRoleAction}
                      className="self-end"
                      confirm={{
                        title: "ロールを無効化しますか",
                        description: `「${role.name}」を無効化します。設定済みの要件は保持されます。`,
                        confirmLabel: "無効化する",
                        destructive: true
                      }}
                    >
                      <input type="hidden" name="id" value={role.id} />
                      <SubmitButton
                        pendingLabel="無効化中…"
                        variant="secondary"
                        disabled={!role.isActive}
                      >
                        無効化
                      </SubmitButton>
                    </ActionForm>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-950">{role.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {role.description ?? "説明未設定"}
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-medium text-slate-700">必要スキル</h3>
                  <div className="mt-3 grid gap-2">
                    {role.roleRequirements.map((requirement) => (
                      <div
                        key={requirement.id}
                        className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-950">
                            {requirement.skill.name}
                          </p>
                          <p className="text-sm text-slate-600">
                            {requirement.skill.category.name} / 必要Lv.
                            {requirement.requiredLevel}
                            {!canManage
                              ? ` / ${requirement.isRequired ? "必須" : "任意"}`
                              : null}
                          </p>
                        </div>
                        {canManage ? (
                          <div className="flex flex-wrap items-end gap-2">
                            <ActionForm action={setRoleRequirementAction} className="flex items-end gap-2">
                              <input type="hidden" name="roleId" value={role.id} />
                              <input type="hidden" name="skillId" value={requirement.skillId} />
                              <SelectField
                                id={`requirement-level-${requirement.id}`}
                                label="必要レベル"
                                labelClassName="sr-only"
                                name="requiredLevel"
                                defaultValue={requirement.requiredLevel}
                                required
                                className="w-32"
                              >
                                {skillLevels.map((level) => (
                                  <option key={level} value={level}>
                                    必要Lv.{level}
                                  </option>
                                ))}
                              </SelectField>
                              <SubmitButton pendingLabel="更新中…">更新</SubmitButton>
                            </ActionForm>
                            <ActionForm
                              action={removeRoleRequirementAction}
                              confirm={{
                                title: "ロール要件を削除しますか",
                                description: `「${requirement.skill.name}」を必要スキルから削除します。`,
                                confirmLabel: "削除する",
                                destructive: true
                              }}
                            >
                              <input type="hidden" name="roleId" value={role.id} />
                              <input type="hidden" name="skillId" value={requirement.skillId} />
                              <SubmitButton pendingLabel="削除中…" variant="ghost">
                                削除
                              </SubmitButton>
                            </ActionForm>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {canManage ? (
                    <ActionForm action={setRoleRequirementAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
                      <input type="hidden" name="roleId" value={role.id} />
                      <SelectField
                        id={`new-requirement-skill-${role.id}`}
                        label="スキル"
                        name="skillId"
                        required
                      >
                        {activeSkills.map((skill) => (
                          <option key={skill.id} value={skill.id}>
                            {skill.category.name} / {skill.name}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        id={`new-requirement-level-${role.id}`}
                        label="必要レベル"
                        name="requiredLevel"
                        required
                      >
                        {skillLevels.map((level) => (
                          <option key={level} value={level}>
                            必要Lv.{level}
                          </option>
                        ))}
                      </SelectField>
                      <SubmitButton pendingLabel="設定中…">要件設定</SubmitButton>
                    </ActionForm>
                  ) : null}
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-medium text-slate-700">達成状況</h3>
                  <div className="mt-3 grid gap-2">
                    {members.map((member) => {
                      const result = evaluateMemberForRole(
                        requirements,
                        member.memberSkills.map((memberSkill) => ({
                          skillId: memberSkill.skillId,
                          level: memberSkill.level,
                          skillName: memberSkill.skill.name
                        }))
                      );

                      return (
                        <div
                          key={member.id}
                          className="rounded-md border border-slate-200 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-950">
                                {member.name}
                              </p>
                              <p className="text-sm text-slate-600">
                                {member.department.name} / {member.jobTitle ?? "役職未設定"}
                              </p>
                            </div>
                            <span
                              className={
                                result.achieved
                                  ? "rounded-md bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-700"
                                  : "rounded-md bg-amber-50 px-2 py-1 text-sm font-medium text-amber-700"
                              }
                            >
                              {result.achieved ? "達成" : "未達"} /{" "}
                              {Math.round(result.achievementRate * 100)}%
                            </span>
                          </div>
                          {result.missingRequirements.length > 0 && (
                            <p className="mt-2 text-sm text-slate-600">
                              不足:{" "}
                              {result.missingRequirements
                                .map(
                                  (requirement) =>
                                    `${requirement.skillName ?? requirement.skillId} Lv.${
                                      requirement.memberLevel ?? 0
                                    }/${requirement.requiredLevel}`
                                )
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
