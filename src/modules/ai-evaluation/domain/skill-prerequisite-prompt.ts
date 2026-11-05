export type PrerequisitePromptSkill = {
  number: number;
  name: string;
  category: string;
  description?: string;
};

export type SkillPrerequisitePromptInput = {
  targets: PrerequisitePromptSkill[];
  candidates: Omit<PrerequisitePromptSkill, "description">[];
  existing: { skill: number; prerequisite: number }[];
};

export function buildSkillPrerequisiteMessages(input: SkillPrerequisitePromptInput) {
  return [
    {
      role: "system" as const,
      content:
        "スキル同士の前提関係を提案してください。そのスキルを実務で使うには、もう一方のスキルの理解がほぼ必須と言えるものだけを出してください。関連があるだけのものは出さないでください。既存の関係と同じ組や逆向きの組は出さないでください。最大30件です。指定されたJSONだけを返してください。形式は {\"suggestions\":[{\"skill\":番号,\"prerequisite\":番号,\"reason\":\"60字以内の日本語\",\"confidence\":\"high\"|\"low\"}]} です。"
    },
    { role: "user" as const, content: JSON.stringify(input) }
  ];
}

export function createFakeSkillPrerequisiteResponse(input: SkillPrerequisitePromptInput) {
  const pairs: Array<[string, string]> = [
    ["Kubernetes", "Docker"],
    ["Node.js", "JavaScript"],
    ["Spring Boot", "Java"],
    ["React", "JavaScript"],
    ["TypeScript", "JavaScript"]
  ];
  const byName = new Map(input.candidates.map((skill) => [skill.name, skill.number]));
  const targetNumbers = new Set(input.targets.map((skill) => skill.number));
  const suggestions = pairs.flatMap(([skillName, prerequisiteName]) => {
    const skill = byName.get(skillName);
    const prerequisite = byName.get(prerequisiteName);
    return skill && prerequisite && targetNumbers.has(skill)
      ? [{ skill, prerequisite, reason: `${prerequisiteName}の理解が実務でほぼ必須です`, confidence: "high" }]
      : [];
  });
  if (suggestions.length === 0 && input.targets[0] && input.candidates[1]) {
    suggestions.push({
      skill: input.targets[0].number,
      prerequisite: input.candidates[1].number,
      reason: "基礎となる知識の理解が実務でほぼ必須です",
      confidence: "low"
    });
  }
  return JSON.stringify({ suggestions: suggestions.slice(0, 5) });
}
