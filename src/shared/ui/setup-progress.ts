export type SetupProgressInput = {
  hasTargetRole: boolean;
  assessmentCount: number;
  approvedSkillCount: number;
};

export type SetupProgressItem = {
  id: "target-role" | "first-assessment" | "first-approval";
  label: string;
  href: "/dashboard#target-role" | "/my/skills" | "/dashboard#first-steps";
  completed: boolean;
};

export type SetupProgress = {
  items: SetupProgressItem[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};

const setupItemDefinitions = [
  {
    id: "target-role",
    label: "目標ロールを決める",
    href: "/dashboard#target-role",
    isCompleted: (input: SetupProgressInput) => input.hasTargetRole
  },
  {
    id: "first-assessment",
    label: "得意なスキルを申請する",
    href: "/my/skills",
    // CSV や seed でスキルを登録済みの人は、申請していなくても済んだとみなす
    isCompleted: (input: SetupProgressInput) =>
      input.assessmentCount >= 1 || input.approvedSkillCount >= 1
  },
  {
    id: "first-approval",
    label: "上司の承認を待つ",
    href: "/dashboard#first-steps",
    isCompleted: (input: SetupProgressInput) => input.approvedSkillCount >= 1
  }
] as const;

export function buildSetupProgress(input: SetupProgressInput): SetupProgress {
  const items = setupItemDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    href: definition.href,
    completed: definition.isCompleted(input)
  }));
  const completedCount = items.filter((item) => item.completed).length;

  return {
    items,
    completedCount,
    totalCount: items.length,
    isComplete: completedCount === items.length
  };
}
