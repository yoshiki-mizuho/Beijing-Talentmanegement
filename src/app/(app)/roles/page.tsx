import type { InputHTMLAttributes } from "react";

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
import { listSkills } from "@/modules/skills/application/skill-service";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export const dynamic = "force-dynamic";

const skillLevels = [1, 2, 3, 4, 5] as const;

export default async function RolesPage() {
  const [roles, skills, members] = await Promise.all([
    listRoles(),
    listSkills(),
    listMembers()
  ]);
  const activeSkills = skills.filter((skill) => skill.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">ロール管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          ロール要件を管理し、メンバーごとの達成状況を確認します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新規ロール</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRoleAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
            <Field label="ロール名" name="name" required />
            <Field label="説明" name="description" />
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked />
              有効
            </label>
            <div className="self-end">
              <Button type="submit">登録</Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
                <form action={updateRoleAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto_auto]">
                  <input type="hidden" name="id" value={role.id} />
                  <Field label="ロール名" name="name" defaultValue={role.name} required />
                  <Field label="説明" name="description" defaultValue={role.description ?? ""} />
                  <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                    <input type="checkbox" name="isActive" defaultChecked={role.isActive} />
                    有効
                  </label>
                  <div className="self-end">
                    <Button type="submit">更新</Button>
                  </div>
                  <div className="self-end">
                    <Button type="submit" formAction={deactivateRoleAction} variant="secondary">
                      無効化
                    </Button>
                  </div>
                </form>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-medium text-slate-700">必要スキル</h3>
                  <div className="mt-3 grid gap-2">
                    {role.roleRequirements.map((requirement) => (
                      <form
                        key={requirement.id}
                        action={removeRoleRequirementAction}
                        className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_auto]"
                      >
                        <input type="hidden" name="roleId" value={role.id} />
                        <input type="hidden" name="skillId" value={requirement.skillId} />
                        <div>
                          <p className="text-sm font-medium text-slate-950">
                            {requirement.skill.name}
                          </p>
                          <p className="text-sm text-slate-600">
                            {requirement.skill.category.name} / 必要Lv.
                            {requirement.requiredLevel}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <select
                            name="requiredLevel"
                            defaultValue={requirement.requiredLevel}
                            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                            required
                          >
                            {skillLevels.map((level) => (
                              <option key={level} value={level}>
                                必要Lv.{level}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" formAction={setRoleRequirementAction}>
                            更新
                          </Button>
                          <Button type="submit" variant="ghost">
                            削除
                          </Button>
                        </div>
                      </form>
                    ))}
                  </div>
                  <form action={setRoleRequirementAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_140px_auto]">
                    <input type="hidden" name="roleId" value={role.id} />
                    <select
                      name="skillId"
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                      required
                    >
                      {activeSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.category.name} / {skill.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="requiredLevel"
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                      required
                    >
                      {skillLevels.map((level) => (
                        <option key={level} value={level}>
                          必要Lv.{level}
                        </option>
                      ))}
                    </select>
                    <Button type="submit">要件設定</Button>
                  </form>
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

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="mt-1 w-full" {...props} />
    </div>
  );
}
