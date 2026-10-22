import type { AuthRole } from "@prisma/client";

import { evaluateMemberForRole } from "@/modules/roles/application/role-service";

type RoleSource = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  roleRequirements: {
    id: string;
    skillId: string;
    requiredLevel: number;
    isRequired: boolean;
    skill: { name: string; category: { name: string } };
  }[];
};

type MemberSource = {
  id: string;
  name: string;
  avatarUpdatedAt: Date | null;
  department: { name: string };
  jobTitle: string | null;
  targetRoleId: string | null;
  memberSkills: { skillId: string; level: number; skill: { name: string } }[];
};

export function buildRolePageViewModel(input: {
  viewerRole: AuthRole;
  viewerMemberId: string;
  scopedMemberIds: string[];
  roles: RoleSource[];
  activeMembers: MemberSource[];
}) {
  const viewer = input.activeMembers.find(
    (member) => member.id === input.viewerMemberId,
  );
  if (!viewer) throw new Error("Viewer member was not found.");

  return input.roles
    .filter((role) => input.viewerRole === "ADMIN" || role.isActive)
    .map((role) => {
      const requirements = role.roleRequirements.map((requirement) => ({
        skillId: requirement.skillId,
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired,
        skillName: requirement.skill.name,
      }));
      const ownStatus = evaluateMemberForRole(
        requirements,
        viewer.memberSkills,
      );
      const allStatuses = input.activeMembers.map((member) => ({
        member,
        result: evaluateMemberForRole(requirements, member.memberSkills),
      }));
      const visibleStatuses =
        input.viewerRole === "MEMBER"
          ? []
          : allStatuses
              .filter(({ member }) => input.scopedMemberIds.includes(member.id))
              .filter(
                ({ member, result }) =>
                  member.targetRoleId === role.id || result.achieved,
              )
              .map(({ member, result }) => ({
                id: member.id,
                name: member.name,
                avatarUpdatedAt: member.avatarUpdatedAt?.toISOString() ?? null,
                departmentName: member.department.name,
                jobTitle: member.jobTitle,
                isTarget: member.targetRoleId === role.id,
                achieved: result.achieved,
                achievementRate: result.achievementRate,
                missingRequirements: result.missingRequirements.map(
                  (requirement) => ({
                    skillName: requirement.skillName ?? requirement.skillId,
                    requiredLevel: requirement.requiredLevel,
                    memberLevel: requirement.memberLevel,
                  }),
                ),
              }));

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        isTarget: viewer.targetRoleId === role.id,
        ownAchievement: {
          achieved: ownStatus.achieved,
          achievementRate: ownStatus.achievementRate,
          satisfiedCount: ownStatus.satisfiedRequirements.length,
          requiredCount:
            ownStatus.satisfiedRequirements.length +
            ownStatus.missingRequirements.length,
        },
        requirements: role.roleRequirements.map((requirement) => {
          const result = [
            ...ownStatus.satisfiedRequirements,
            ...ownStatus.missingRequirements,
          ].find((item) => item.skillId === requirement.skillId);
          return {
            id: requirement.id,
            skillId: requirement.skillId,
            requiredLevel: requirement.requiredLevel,
            isRequired: requirement.isRequired,
            memberLevel: result?.memberLevel ?? null,
            satisfied: result?.satisfied ?? false,
            skill: {
              name: requirement.skill.name,
              categoryName: requirement.skill.category.name,
            },
          };
        }),
        achievedMemberCount: allStatuses.filter(({ result }) => result.achieved)
          .length,
        visibleMemberStatuses: visibleStatuses,
      };
    });
}
