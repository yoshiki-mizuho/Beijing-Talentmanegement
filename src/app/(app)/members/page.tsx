import { MemberStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { listMembers, listDepartments } from "@/modules/members/application/member-service";
import { MemberSearchTable } from "@/modules/members/presentation/member-search-table";
import {
  createMemberAction,
  deactivateMemberAction,
  removeMemberSkillAction,
  setMemberSkillLevelAction,
  updateMemberAction
} from "@/modules/members/presentation/actions";
import { listSkills } from "@/modules/skills/application/skill-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

const skillLevels = [1, 2, 3, 4, 5] as const;

export default async function MembersPage() {
  const [members, departments, skills, roles] = await Promise.all([
    listMembers(),
    listDepartments(),
    listSkills(),
    listRoles()
  ]);
  const activeSkills = skills.filter((skill) => skill.isActive);
  const memberRows = members.map((member) => ({
    id: member.id,
    employeeNo: member.employeeNo,
    name: member.name,
    email: member.email,
    status: member.status,
    jobTitle: member.jobTitle,
    departmentId: member.departmentId,
    department: {
      id: member.department.id,
      name: member.department.name
    },
    memberSkills: member.memberSkills.map((memberSkill) => ({
      id: memberSkill.id,
      skillId: memberSkill.skillId,
      level: memberSkill.level,
      skill: {
        id: memberSkill.skill.id,
        name: memberSkill.skill.name,
        category: {
          name: memberSkill.skill.category.name
        }
      }
    }))
  }));
  const skillOptions = activeSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: {
      name: skill.category.name
    }
  }));
  const roleOptions = roles.map((role) => ({
    id: role.id,
    name: role.name,
    roleRequirements: role.roleRequirements.map((requirement) => ({
      skillId: requirement.skillId,
      requiredLevel: requirement.requiredLevel,
      isRequired: requirement.isRequired,
      skill: {
        name: requirement.skill.name
      }
    }))
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People intelligence"
        title="メンバー"
        description="組織のメンバー情報、保有スキル、ロール充足状況を確認・管理します。"
      />

      <Card>
        <CardHeader>
          <CardTitle>検索・ロール保有状況</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberSearchTable
            initialMembers={memberRows}
            departments={departments}
            skills={skillOptions}
            roles={roleOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>新規メンバー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            初期パスワードは password です。初回ログイン後にパスワード変更が必要です。
          </p>
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
                className="mt-1 min-h-20 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]/20"
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
                    className="mt-1 min-h-20 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]/20"
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
                    className="h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm"
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
                    className="h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm"
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
