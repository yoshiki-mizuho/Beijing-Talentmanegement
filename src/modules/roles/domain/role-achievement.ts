export type SkillLevelRequirement = {
  skillId: string;
  requiredLevel: number;
  isRequired: boolean;
  skillName?: string;
};

export type MemberSkillLevel = {
  skillId: string;
  level: number;
  skillName?: string;
};

export type RequirementResult = SkillLevelRequirement & {
  memberLevel: number | null;
  satisfied: boolean;
};

export type RoleAchievementResult = {
  achieved: boolean;
  achievementRate: number;
  satisfiedRequirements: RequirementResult[];
  missingRequirements: RequirementResult[];
};

export function isRoleAchieved(
  requirements: SkillLevelRequirement[],
  memberSkills: MemberSkillLevel[]
) {
  const memberSkillLevelBySkillId = new Map(
    memberSkills.map((memberSkill) => [memberSkill.skillId, memberSkill.level])
  );

  return requirements
    .filter((requirement) => requirement.isRequired)
    .every((requirement) => {
      const memberLevel = memberSkillLevelBySkillId.get(requirement.skillId);
      return memberLevel !== undefined && memberLevel >= requirement.requiredLevel;
    });
}

export function evaluateRoleAchievement(
  requirements: SkillLevelRequirement[],
  memberSkills: MemberSkillLevel[]
): RoleAchievementResult {
  const requiredRequirements = requirements.filter(
    (requirement) => requirement.isRequired
  );
  const memberSkillLevelBySkillId = new Map(
    memberSkills.map((memberSkill) => [memberSkill.skillId, memberSkill.level])
  );

  const results = requiredRequirements.map((requirement) => {
    const memberLevel = memberSkillLevelBySkillId.get(requirement.skillId) ?? null;

    return {
      ...requirement,
      memberLevel,
      satisfied: memberLevel !== null && memberLevel >= requirement.requiredLevel
    };
  });
  const satisfiedRequirements = results.filter((result) => result.satisfied);
  const missingRequirements = results.filter((result) => !result.satisfied);

  return {
    achieved: missingRequirements.length === 0,
    achievementRate:
      results.length === 0 ? 1 : satisfiedRequirements.length / results.length,
    satisfiedRequirements,
    missingRequirements
  };
}
