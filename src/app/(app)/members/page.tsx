import { MemberStatus } from "@prisma/client";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { listMembers, listDepartments } from "@/modules/members/application/member-service";
import { MemberSearchTable } from "@/modules/members/presentation/member-search-table";
import { createMemberAction } from "@/modules/members/presentation/actions";
import { listSkills } from "@/modules/skills/application/skill-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { PageHeader } from "@/shared/ui/page-header";
import { managerOrAdmin, requireRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await requireRoles(managerOrAdmin);
  const canDeactivateMembers = session.user.role === "ADMIN";
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
    profile: member.profile,
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
            canDeactivateMembers={canDeactivateMembers}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>新規メンバー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            初回ログイン後にパスワード変更が必要です。初期認証情報は安全な経路で本人へ共有してください。
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
