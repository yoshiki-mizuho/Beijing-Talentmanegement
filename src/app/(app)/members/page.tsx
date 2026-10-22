import {
  listDepartments,
  listManagerCandidates,
  listMembers
} from "@/modules/members/application/member-service";
import { MemberSearchTable } from "@/modules/members/presentation/member-search-table";
import { listSkills } from "@/modules/skills/application/skill-service";
import { listRoles } from "@/modules/roles/application/role-service";
import { Card, CardContent } from "@/shared/ui/card";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { parseTargetRoleFilter } from "@/modules/members/presentation/target-role-filter";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ targetRole?: string | string[] }>;
}) {
  const { targetRole } = await searchParams;
  const session = await requirePageRoles(managerOrAdmin);
  const canCreateMembers = session.user.role === "ADMIN";
  const canDeactivateMembers = session.user.role === "ADMIN";
  const canEditGrowthSettings = session.user.role === "ADMIN";
  const scope = await getMemberScope(session.user.role, session.user.memberId);
  const [members, departments, skills, roles, managerCandidates] = await Promise.all([
    listMembers(undefined, scope.memberIds),
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
    avatarUpdatedAt: member.avatarUpdatedAt?.toISOString() ?? null,
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
    growthHint: member.growthHint
      ? { generatedAt: member.growthHint.generatedAt.toISOString() }
      : null,
    role: member.users[0]?.role ?? null,
    pendingAssessments: member.selfAssessments,
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
      <Card>
        <CardContent className="pt-5">
          <MemberSearchTable
            initialMembers={memberRows}
            departments={departments}
            skills={skillOptions}
            roles={roleOptions}
            managerCandidates={managerCandidates}
            targetRoles={targetRoleOptions}
            canCreateMembers={canCreateMembers}
            canDeactivateMembers={canDeactivateMembers}
            canEditGrowthSettings={canEditGrowthSettings}
            viewerMemberId={session.user.memberId}
            scopeName={scope.name}
            initialTargetRoleFilter={parseTargetRoleFilter(targetRole)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
