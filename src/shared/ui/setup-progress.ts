export type SetupProgressInput = {
  passwordChangeRequired: boolean;
  assessmentCount: number;
  approvedSkillCount: number;
};

export type SetupProgressItem = {
  id: "password" | "first-assessment" | "five-skills";
  label: string;
  href: "/account/password" | "/my/skills";
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
    id: "password",
    label: "初回パスワードを変更",
    href: "/account/password",
    isCompleted: (input: SetupProgressInput) => !input.passwordChangeRequired
  },
  {
    id: "first-assessment",
    label: "はじめてのスキル申請",
    href: "/my/skills",
    isCompleted: (input: SetupProgressInput) => input.assessmentCount >= 1
  },
  {
    id: "five-skills",
    label: "スキルを5件登録",
    href: "/my/skills",
    isCompleted: (input: SetupProgressInput) => input.approvedSkillCount >= 5
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
