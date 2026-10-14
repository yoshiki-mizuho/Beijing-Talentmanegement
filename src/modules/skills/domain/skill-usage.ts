export type SkillUsage = {
  memberSkills: number;
  selfAssessments: number;
  skillLevelChanges: number;
  cheers: number;
  roleRequirements: number;
};

const usageLabels: { key: keyof SkillUsage; label: string }[] = [
  { key: "memberSkills", label: "保有" },
  { key: "selfAssessments", label: "申告" },
  { key: "skillLevelChanges", label: "履歴" },
  { key: "cheers", label: "応援" },
  { key: "roleRequirements", label: "ロール要件" }
];

export function getSkillDeletionState(usage: SkillUsage) {
  const usedBy = usageLabels
    .filter(({ key }) => usage[key] > 0)
    .map(({ label }) => label);

  return {
    isDeletable: usedBy.length === 0,
    reason:
      usedBy.length === 0
        ? null
        : `${usedBy.join("・")}があるため削除できません。無効化してください。`
  };
}
