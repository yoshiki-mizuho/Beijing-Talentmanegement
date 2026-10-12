import { evaluateRoleAchievement, type SkillLevelRequirement } from "@/modules/roles/domain/role-achievement";

type StatisticsMember = {
  status: string;
  targetRoleId: string | null;
  memberSkills: { skillId: string; level: number }[];
};

export function calculateRoleStatistics(
  roleId: string,
  requirements: SkillLevelRequirement[],
  members: readonly StatisticsMember[]
) {
  const activeMembers = members.filter((member) => member.status === "ACTIVE");
  return {
    achievedCount: activeMembers.filter((member) =>
      evaluateRoleAchievement(requirements, member.memberSkills).achieved
    ).length,
    targetCount: activeMembers.filter((member) => member.targetRoleId === roleId).length
  };
}
