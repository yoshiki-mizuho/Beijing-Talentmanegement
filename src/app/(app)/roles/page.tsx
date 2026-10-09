import { listMembers } from "@/modules/members/application/member-service";
import {
  evaluateMemberForRole,
  listRoles
} from "@/modules/roles/application/role-service";
import { canManageRoles } from "@/modules/roles/presentation/role-permissions";
import { RoleManagement } from "@/modules/roles/presentation/role-management";
import { listSkills } from "@/modules/skills/application/skill-service";
import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await requirePageRoles(managerOrAdmin);
  const canManage = canManageRoles(session.user.role);
  const [roles, skills, members] = await Promise.all([
    listRoles(),
    listSkills(),
    listMembers()
  ]);

  const roleItems = roles.map((role) => {
    const requirements = role.roleRequirements.map((requirement) => ({
      skillId: requirement.skillId,
      requiredLevel: requirement.requiredLevel,
      isRequired: requirement.isRequired,
      skillName: requirement.skill.name
    }));
    const memberStatuses = members.map((member) => {
      const result = evaluateMemberForRole(
        requirements,
        member.memberSkills.map((memberSkill) => ({
          skillId: memberSkill.skillId,
          level: memberSkill.level,
          skillName: memberSkill.skill.name
        }))
      );

      return {
        id: member.id,
        name: member.name,
        departmentName: member.department.name,
        jobTitle: member.jobTitle,
        achieved: result.achieved,
        achievementRate: result.achievementRate,
        missingRequirements: result.missingRequirements.map((requirement) => ({
          skillId: requirement.skillId,
          skillName: requirement.skillName ?? requirement.skillId,
          requiredLevel: requirement.requiredLevel,
          memberLevel: requirement.memberLevel
        }))
      };
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      requirements: role.roleRequirements.map((requirement) => ({
        id: requirement.id,
        skillId: requirement.skillId,
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired,
        skill: {
          name: requirement.skill.name,
          categoryName: requirement.skill.category.name
        }
      })),
      memberStatuses,
      achievedMemberCount: memberStatuses.filter((status) => status.achieved).length
    };
  });

  return (
    <RoleManagement
      roles={roleItems}
      skills={skills
        .filter((skill) => skill.isActive)
        .map((skill) => ({
          id: skill.id,
          name: skill.name,
          categoryName: skill.category.name
        }))}
      canManage={canManage}
    />
  );
}
