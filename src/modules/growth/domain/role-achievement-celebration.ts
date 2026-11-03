import {
  evaluateRoleAchievement,
  type MemberSkillLevel,
  type SkillLevelRequirement
} from "@/modules/roles/domain/role-achievement";

export type CelebrationLevelChange = {
  skillId: string;
  fromLevel: number | null;
  changedAt: Date;
};

export type CelebrationRole = {
  id: string;
  name: string;
  requirements: SkillLevelRequirement[];
};

export function detectNewRoleAchievement(input: {
  requirements: SkillLevelRequirement[];
  currentSkills: MemberSkillLevel[];
  changes: CelebrationLevelChange[];
}) {
  if (input.requirements.length === 0) return null;
  const current = evaluateRoleAchievement(input.requirements, input.currentSkills);
  if (!current.achieved) return null;

  const oldestChangeBySkill = new Map<string, CelebrationLevelChange>();
  for (const change of input.changes) {
    const previous = oldestChangeBySkill.get(change.skillId);
    if (!previous || change.changedAt < previous.changedAt) {
      oldestChangeBySkill.set(change.skillId, change);
    }
  }
  const previousSkills = input.currentSkills.flatMap((skill) => {
    const change = oldestChangeBySkill.get(skill.skillId);
    if (!change) return [skill];
    return change.fromLevel === null ? [] : [{ ...skill, level: change.fromLevel }];
  });
  const previous = evaluateRoleAchievement(input.requirements, previousSkills);
  return previous.achieved ? null : current;
}

export type NextRoleCandidate = {
  id: string;
  name: string;
  percentage: number;
  missingCount: number;
  missingSkills: string[];
  hasMoreMissingSkills: boolean;
};

export function buildNextRoleCandidates(input: {
  roles: CelebrationRole[];
  currentRoleId: string;
  currentSkills: MemberSkillLevel[];
}): NextRoleCandidate[] {
  return input.roles.flatMap((role) => {
    if (role.id === input.currentRoleId || role.requirements.length === 0) return [];
    const evaluation = evaluateRoleAchievement(role.requirements, input.currentSkills);
    if (evaluation.achieved) return [];
    return [{
      id: role.id,
      name: role.name,
      percentage: Math.round(evaluation.achievementRate * 100),
      missingCount: evaluation.missingRequirements.length,
      missingSkills: evaluation.missingRequirements.slice(0, 2).map(
        (requirement) => `${requirement.skillName ?? "スキル"} Lv${requirement.requiredLevel}`
      ),
      hasMoreMissingSkills: evaluation.missingRequirements.length > 2
    }];
  }).sort((left, right) =>
    right.percentage - left.percentage ||
    left.missingCount - right.missingCount ||
    left.name.localeCompare(right.name, "ja")
  ).slice(0, 3);
}
