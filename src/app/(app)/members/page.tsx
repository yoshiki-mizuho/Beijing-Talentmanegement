import { MemberStatus } from "@prisma/client";

import { listMembers, listDepartments } from "@/modules/members/application/member-service";
import { MemberSearchTable } from "@/modules/members/presentation/member-search-table";
import { createMemberAction } from "@/modules/members/presentation/actions";
import { listSkills } from "@/modules/skills/application/skill-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { ActionForm } from "@/shared/ui/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await requirePageRoles(managerOrAdmin);
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
          <ActionForm action={createMemberAction} className="grid gap-3 md:grid-cols-3">
            <FormField id="new-member-employee-no" label="社員番号" name="employeeNo" required />
            <FormField id="new-member-name" label="氏名" name="name" required />
            <FormField id="new-member-email" label="メール" name="email" type="email" required />
            <SelectField id="new-member-department" label="部署" name="departmentId" required>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>
            <FormField id="new-member-job-title" label="役職" name="jobTitle" />
            <SelectField id="new-member-status" label="状態" name="status" defaultValue={MemberStatus.ACTIVE}>
              {Object.values(MemberStatus).map((status) => (
                <option key={status} value={status}>
                  {status === MemberStatus.ACTIVE
                    ? "在籍中"
                    : status === MemberStatus.INACTIVE
                      ? "退職・無効"
                      : "休職中"}
                </option>
              ))}
            </SelectField>
            <TextareaField
              id="new-member-profile"
              label="プロフィール"
              name="profile"
              className="md:col-span-3"
            />
            <div className="md:col-span-3">
              <SubmitButton pendingLabel="登録中…">登録</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

    </div>
  );
}
