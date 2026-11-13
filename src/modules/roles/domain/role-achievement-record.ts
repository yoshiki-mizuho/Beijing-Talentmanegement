import { evaluateRoleAchievement, type SkillLevelRequirement } from "@/modules/roles/domain/role-achievement";

export type RoleAchievementCandidate = {
  memberId: string;
  targetRoleId: string | null;
  memberSkills: { skillId: string; level: number }[];
  role: {
    id: string;
    isActive: boolean;
    requirements: SkillLevelRequirement[];
  };
};

export function selectNewRoleAchievements(
  candidates: RoleAchievementCandidate[],
  existingKeys: Set<string>,
  achievedAt: Date
) {
  return candidates.flatMap((candidate) => {
    const key = `${candidate.memberId}:${candidate.role.id}`;
    if (
      !candidate.role.isActive ||
      existingKeys.has(key) ||
      !evaluateRoleAchievement(candidate.role.requirements, candidate.memberSkills).achieved
    ) {
      return [];
    }
    const achievedAsTarget = candidate.targetRoleId === candidate.role.id;
    return [{
      memberId: candidate.memberId,
      roleId: candidate.role.id,
      achievedAt,
      achievedAsTarget,
      celebratedAt: achievedAsTarget ? null : achievedAt,
      requirements: candidate.role.requirements.map((requirement) => ({
        skillId: requirement.skillId,
        skillName: requirement.skillName ?? requirement.skillId,
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired,
        anyOfGroup: requirement.anyOfGroup ?? null
      }))
    }];
  });
}

export function selectPendingRoleAchievement<T extends {
  achievedAt: Date;
  celebratedAt: Date | null;
}>(achievements: ReadonlyArray<T>) {
  return achievements
    .filter((achievement) => achievement.celebratedAt === null)
    .sort((left, right) => left.achievedAt.getTime() - right.achievedAt.getTime())[0] ?? null;
}
