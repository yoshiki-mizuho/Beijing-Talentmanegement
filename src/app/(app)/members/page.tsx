import {
  listDepartments,
  listManagerCandidates,
  listMembers
} from "@/modules/members/application/member-service";
import { MemberCreateDialog } from "@/modules/members/presentation/member-create-dialog";
import { MemberSearchTable } from "@/modules/members/presentation/member-search-table";
import { listSkills } from "@/modules/skills/application/skill-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await requirePageRoles(managerOrAdmin);
  const canDeactivateMembers = session.user.role === "ADMIN";
  const canEditGrowthSettings = session.user.role === "ADMIN";
  const [members, departments, skills, roles, managerCandidates] = await Promise.all([
    listMembers(),
    listDepartments(),
    listSkills(),
    listRoles(),
    listManagerCandidates()
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
    managerId: member.managerId,
    manager: member.manager,
    targetRoleId: member.targetRoleId,
    targetRole: member.targetRole,
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
  const targetRoleOptions = roles
    .filter((role) => role.isActive)
    .map((role) => ({ id: role.id, name: role.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="メンバー"
        description="組織のメンバー情報、保有スキル、ロール充足状況を確認・管理します。"
        actions={
          <MemberCreateDialog
            departments={departments}
            managerCandidates={managerCandidates}
            targetRoles={targetRoleOptions}
            canEditGrowthSettings={canEditGrowthSettings}
          />
        }
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
            managerCandidates={managerCandidates}
            targetRoles={targetRoleOptions}
            canDeactivateMembers={canDeactivateMembers}
            canEditGrowthSettings={canEditGrowthSettings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
