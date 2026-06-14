export type SkillLevelRequirement = {
  skillId: string;
  requiredLevel: number;
  isRequired: boolean;
};

export type MemberSkillLevel = {
  skillId: string;
  level: number;
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
