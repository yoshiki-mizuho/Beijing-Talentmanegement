import type { AuthRole } from "@prisma/client";

import { evaluateMemberForRole } from "@/modules/roles/application/role-service";
import { resolveRoleAchievementStatus } from "@/modules/roles/domain/role-achievement";

type RoleSource = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  roleRequirements: {
    id: string;
    skillId: string;
    requiredLevel: number;
    isRequired: boolean;
    anyOfGroup?: number | null;
    skill: { name: string; category: { name: string } };
  }[];
  _count: { roleAchievements: number };
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
  achievements: { memberId: string; roleId: string }[];
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
        anyOfGroup: requirement.anyOfGroup,
        skillName: requirement.skill.name,
      }));
      const ownStatus = evaluateMemberForRole(
        requirements,
        viewer.memberSkills,
      );
      const recordedMemberIds = new Set(
        input.achievements
          .filter((achievement) => achievement.roleId === role.id)
          .map((achievement) => achievement.memberId)
      );
      const allStatuses = input.activeMembers.map((member) => ({
        member,
        result: evaluateMemberForRole(requirements, member.memberSkills),
        recorded: recordedMemberIds.has(member.id)
      }));
      const visibleStatuses =
        input.viewerRole === "MEMBER"
          ? []
          : allStatuses
              .filter(({ member }) => input.scopedMemberIds.includes(member.id))
              .filter(
                ({ member, recorded }) =>
                  member.targetRoleId === role.id || recorded,
              )
              .map(({ member, result, recorded }) => ({
                id: member.id,
                name: member.name,
                avatarUpdatedAt: member.avatarUpdatedAt?.toISOString() ?? null,
                departmentName: member.department.name,
                jobTitle: member.jobTitle,
                isTarget: member.targetRoleId === role.id,
                achieved: recorded,
                requirementsUpdated: recorded && !result.achieved,
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
        code: role.code,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        isTarget: viewer.targetRoleId === role.id,
        canDelete: role._count.roleAchievements === 0,
        ownAchievement: {
          achieved: recordedMemberIds.has(viewer.id),
          status: resolveRoleAchievementStatus({
            recorded: recordedMemberIds.has(viewer.id),
            currentlySatisfied: ownStatus.achieved
          }),
          achievementRate: ownStatus.achievementRate,
          satisfiedCount: ownStatus.satisfiedCount,
          requiredCount: ownStatus.requiredCount,
        },
        requirements: [...role.roleRequirements].sort((left, right) =>
          (left.anyOfGroup == null ? -1 : left.anyOfGroup) -
          (right.anyOfGroup == null ? -1 : right.anyOfGroup)
        ).map((requirement) => {
          const result = [
            ...ownStatus.satisfiedRequirements,
            ...ownStatus.missingRequirements,
          ].find((item) => item.skillId === requirement.skillId);
          return {
            id: requirement.id,
            skillId: requirement.skillId,
            requiredLevel: requirement.requiredLevel,
            isRequired: requirement.isRequired,
            anyOfGroup: requirement.anyOfGroup ?? null,
            memberLevel: result?.memberLevel ?? null,
            satisfied: result?.satisfied ?? false,
            skill: {
              name: requirement.skill.name,
              categoryName: requirement.skill.category.name,
            },
          };
        }),
        achievedMemberCount: allStatuses.filter(({ recorded }) => recorded)
          .length,
        visibleMemberStatuses: visibleStatuses,
      };
    });
}
