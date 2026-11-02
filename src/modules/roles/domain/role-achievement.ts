export type SkillLevelRequirement = {
  skillId: string;
  requiredLevel: number;
  isRequired: boolean;
  anyOfGroup?: number | null;
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
  units: RequirementUnitResult[];
  satisfiedCount: number;
  requiredCount: number;
};

export type RequirementUnit =
  | { kind: "single"; requirement: SkillLevelRequirement }
  | { kind: "anyOf"; group: number; requirements: SkillLevelRequirement[] };

export type RequirementUnitResult =
  | { kind: "single"; satisfied: boolean; requirement: RequirementResult }
  | { kind: "anyOf"; group: number; satisfied: boolean; requirements: RequirementResult[] };

export function groupRoleRequirements(requirements: SkillLevelRequirement[]): RequirementUnit[] {
  const required = requirements.filter((requirement) => requirement.isRequired);
  const grouped = new Map<number, SkillLevelRequirement[]>();
  const units: RequirementUnit[] = [];
  for (const requirement of required) {
    if (requirement.anyOfGroup == null) units.push({ kind: "single", requirement });
    else grouped.set(requirement.anyOfGroup, [...(grouped.get(requirement.anyOfGroup) ?? []), requirement]);
  }
  for (const [group, items] of grouped) {
    units.push(items.length < 2
      ? { kind: "single", requirement: items[0] }
      : { kind: "anyOf", group, requirements: items });
  }
  return units;
}

export function isRoleAchieved(
  requirements: SkillLevelRequirement[],
  memberSkills: MemberSkillLevel[]
) {
  return evaluateRoleAchievement(requirements, memberSkills).achieved;
}

export function evaluateRoleAchievement(
  requirements: SkillLevelRequirement[],
  memberSkills: MemberSkillLevel[]
): RoleAchievementResult {
  const memberSkillLevelBySkillId = new Map(
    memberSkills.map((memberSkill) => [memberSkill.skillId, memberSkill.level])
  );

  const evaluate = (requirement: SkillLevelRequirement): RequirementResult => {
    const memberLevel = memberSkillLevelBySkillId.get(requirement.skillId) ?? null;

    return {
      ...requirement,
      memberLevel,
      satisfied: memberLevel !== null && memberLevel >= requirement.requiredLevel
    };
  };
  const units = groupRoleRequirements(requirements).map((unit): RequirementUnitResult => {
    if (unit.kind === "single") {
      const requirement = evaluate(unit.requirement);
      return { kind: "single", satisfied: requirement.satisfied, requirement };
    }
    const groupRequirements = unit.requirements.map(evaluate);
    return { kind: "anyOf", group: unit.group, satisfied: groupRequirements.some((item) => item.satisfied), requirements: groupRequirements };
  });
  const results = units.flatMap((unit) => unit.kind === "single" ? [unit.requirement] : unit.requirements);
  const satisfiedRequirements = results.filter((result) => result.satisfied);
  const missingRequirements = units.filter((unit) => !unit.satisfied).map((unit) => {
    if (unit.kind === "single") return unit.requirement;
    return [...unit.requirements].sort((left, right) =>
      (left.requiredLevel - (left.memberLevel ?? 0)) - (right.requiredLevel - (right.memberLevel ?? 0))
    )[0];
  });
  const satisfiedCount = units.filter((unit) => unit.satisfied).length;

  return {
    achieved: units.every((unit) => unit.satisfied),
    achievementRate: units.length === 0 ? 1 : satisfiedCount / units.length,
    satisfiedRequirements,
    missingRequirements,
    units,
    satisfiedCount,
    requiredCount: units.length
  };
}
