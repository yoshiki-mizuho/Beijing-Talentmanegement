export type SkillSheetRow = {
  skillId: string;
  skillName: string;
  categoryId: string;
  categoryName: string;
  categoryDisplayOrder: number;
  currentLevel: number | null;
  pendingLevel: number | null;
  targetLevel: number | null;
};

type SkillSheetSource = {
  skills: ReadonlyArray<{
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
      displayOrder: number;
    };
  }>;
  memberSkills: ReadonlyArray<{ skillId: string; level: number }>;
  pendingAssessments: ReadonlyArray<{
    skillId: string;
    requestedLevel: number;
  }>;
  targetRequirements: ReadonlyArray<{
    skillId: string;
    requiredLevel: number;
  }>;
};

export const SKILL_SHEET_ENCOURAGEMENT_MESSAGES = {
  first: "最初の一歩を記録しましょう。",
  recent:
    "最近の申請を記録できています。次の前進も、焦らず積み重ねていきましょう。",
  weeks: (weeks: number) =>
    `前回の申請から${weeks}週間。小さな前進も、記録すると次の自信になります。`,
  months: (months: number) =>
    `前回の申請から${months}か月。これまでの変化を振り返り、今の力を記録してみましょう。`
} as const;

export function buildSkillSheetRows({
  skills,
  memberSkills,
  pendingAssessments,
  targetRequirements
}: SkillSheetSource): SkillSheetRow[] {
  const currentLevels = new Map(
    memberSkills.map((memberSkill) => [memberSkill.skillId, memberSkill.level])
  );
  const pendingLevels = new Map(
    pendingAssessments.map((assessment) => [
      assessment.skillId,
      assessment.requestedLevel
    ])
  );
  const targetLevels = new Map(
    targetRequirements.map((requirement) => [
      requirement.skillId,
      requirement.requiredLevel
    ])
  );

  return skills
    .map((skill) => ({
      skillId: skill.id,
      skillName: skill.name,
      categoryId: skill.category.id,
      categoryName: skill.category.name,
      categoryDisplayOrder: skill.category.displayOrder,
      currentLevel: currentLevels.get(skill.id) ?? null,
      pendingLevel: pendingLevels.get(skill.id) ?? null,
      targetLevel: targetLevels.get(skill.id) ?? null
    }))
    .sort(
      (left, right) =>
        left.categoryDisplayOrder - right.categoryDisplayOrder ||
        left.skillName.localeCompare(right.skillName, "ja")
    );
}

export function getSkillSheetRowStatus(row: SkillSheetRow): string[] {
  return [
    row.currentLevel === null ? "未保有" : `現在 Lv${row.currentLevel}`,
    ...(row.pendingLevel === null
      ? []
      : [`承認待ち（申請 Lv${row.pendingLevel}）`]),
    ...(row.targetLevel === null
      ? []
      : [`目標ロールで Lv${row.targetLevel} が必要`])
  ];
}

export function isSkillSheetRowChanged(
  currentLevel: number | null,
  selectedLevel: number | null
) {
  return selectedLevel !== null && selectedLevel !== currentLevel;
}

export function getNextSkillSheetLevel(
  currentLevel: number | null,
  selectedLevel: number | null,
  clickedLevel: number
): number | null {
  if (clickedLevel === currentLevel || clickedLevel === selectedLevel) {
    return null;
  }

  return clickedLevel;
}

export function getSkillLevelDefinitionText(
  currentLevel: number | null,
  selectedLevel: number | null,
  description: string | undefined
) {
  const displayedLevel = selectedLevel ?? currentLevel;

  if (displayedLevel === null) {
    return "レベルを選ぶと、定義を確認できます。";
  }

  const definition = description ?? "レベル定義が登録されていません。";
  if (isSkillSheetRowChanged(currentLevel, selectedLevel)) {
    const from = currentLevel === null ? "未保有" : `Lv${currentLevel}`;
    return `${from} → Lv${selectedLevel}：${definition}`;
  }

  return `Lv${displayedLevel}：${definition}`;
}

export function selectSkillSheetEncouragement(
  lastAssessmentAt: Date | string | null,
  now: Date = new Date()
) {
  if (lastAssessmentAt === null) {
    return SKILL_SHEET_ENCOURAGEMENT_MESSAGES.first;
  }

  const elapsedMilliseconds = Math.max(
    0,
    now.getTime() - new Date(lastAssessmentAt).getTime()
  );
  const elapsedDays = Math.floor(elapsedMilliseconds / (24 * 60 * 60 * 1000));

  if (elapsedDays < 7) {
    return SKILL_SHEET_ENCOURAGEMENT_MESSAGES.recent;
  }
  if (elapsedDays < 30) {
    return SKILL_SHEET_ENCOURAGEMENT_MESSAGES.weeks(
      Math.max(1, Math.floor(elapsedDays / 7))
    );
  }

  return SKILL_SHEET_ENCOURAGEMENT_MESSAGES.months(
    Math.max(1, Math.floor(elapsedDays / 30))
  );
}
