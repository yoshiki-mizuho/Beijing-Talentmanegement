import { MemberStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { listMembers, listDepartments } from "@/modules/members/application/member-service";
import {
  createMemberAction,
  deactivateMemberAction,
  removeMemberSkillAction,
  setMemberSkillLevelAction,
  updateMemberAction
} from "@/modules/members/presentation/actions";
import { listSkills } from "@/modules/skills/application/skill-service";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export const dynamic = "force-dynamic";

const skillLevels = [1, 2, 3, 4, 5] as const;

export default async function MembersPage() {
  const [members, departments, skills] = await Promise.all([
    listMembers(),
    listDepartments(),
    listSkills()
  ]);
  const activeSkills = skills.filter((skill) => skill.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">メンバー</h1>
        <p className="mt-1 text-sm text-slate-600">
          メンバー情報と保有スキルを管理します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新規メンバー</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMemberAction} className="grid gap-3 md:grid-cols-3">
            <Field label="社員番号" name="employeeNo" required />
            <Field label="氏名" name="name" required />
            <Field label="メール" name="email" type="email" required />
            <Select label="部署" name="departmentId" required>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <Field label="役職" name="jobTitle" />
            <Select label="状態" name="status" defaultValue={MemberStatus.ACTIVE}>
              {Object.values(MemberStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <div className="md:col-span-3">
              <Label htmlFor="profile">プロフィール</Label>
              <textarea
                id="profile"
                name="profile"
                className="mt-1 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">登録</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {members.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <CardTitle>
                {member.employeeNo} / {member.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={updateMemberAction} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="id" value={member.id} />
                <Field label="社員番号" name="employeeNo" defaultValue={member.employeeNo} required />
                <Field label="氏名" name="name" defaultValue={member.name} required />
                <Field label="メール" name="email" type="email" defaultValue={member.email} required />
                <Select label="部署" name="departmentId" defaultValue={member.departmentId}>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
                <Field label="役職" name="jobTitle" defaultValue={member.jobTitle ?? ""} />
                <Select label="状態" name="status" defaultValue={member.status}>
                  {Object.values(MemberStatus).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
                <div className="md:col-span-3">
                  <Label htmlFor={`profile-${member.id}`}>プロフィール</Label>
                  <textarea
                    id={`profile-${member.id}`}
                    name="profile"
                    defaultValue={member.profile ?? ""}
                    className="mt-1 min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
                  />
                </div>
                <div className="flex gap-2 md:col-span-3">
                  <Button type="submit">更新</Button>
                  <Button type="submit" formAction={deactivateMemberAction} variant="secondary">
                    無効化
                  </Button>
                </div>
              </form>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium text-slate-700">保有スキル</h3>
                <div className="mt-3 grid gap-2">
                  {member.memberSkills.map((memberSkill) => (
                    <div
                      key={memberSkill.id}
                      className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-950">
                          {memberSkill.skill.name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {memberSkill.skill.category.name} / Lv.{memberSkill.level}
                        </p>
                      </div>
                      <form action={removeMemberSkillAction}>
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="skillId" value={memberSkill.skillId} />
                        <Button type="submit" variant="ghost" aria-label="スキルを削除">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
                <form action={setMemberSkillLevelAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_120px_auto]">
                  <input type="hidden" name="memberId" value={member.id} />
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
                    name="level"
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                    required
                  >
                    {skillLevels.map((level) => (
                      <option key={level} value={level}>
                        Lv.{level}
                      </option>
                    ))}
                  </select>
                  <Button type="submit">スキル設定</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
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

function Select({
  label,
  name,
  children,
  ...props
}: {
  label: string;
  name: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
