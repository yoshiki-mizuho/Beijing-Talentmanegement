import type { AiGrowthHint } from "@/modules/ai-evaluation/domain/growth-hint";
import type { GrowthHintInput } from "@/modules/ai-evaluation/domain/growth-hint-input";

export function createFallbackGrowthHint(input: GrowthHintInput): AiGrowthHint {
  const strength = input.approvedSkills[0];
  const gap = input.skillGaps[0];
  return {
    strengthsSummary: strength
      ? `${strength.name} Lv${strength.level}を得意なこととして活かせます。`
      : "承認済みのスキルを増やしながら、得意なことを見つけていけます。",
    nextSteps: [
      gap
        ? `${gap.name}を Lv${gap.requiredLevel} に近づけるため、実務で使う機会をつくる。`
        : "得意なことを実務で活かせた場面を振り返る。",
    ],
    oneOnOneTopics: [
      gap ? `${gap.name}を実務で試せる機会` : "得意なことを次に活かせる場面",
    ],
  };
}
