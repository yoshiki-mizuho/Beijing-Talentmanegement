import type { GrowthHintInput } from "@/modules/ai-evaluation/domain/growth-hint-input";

export function buildGrowthHintMessages(input: GrowthHintInput) {
  return [
    {
      role: "system" as const,
      content:
        "マネージャーが部下の成長を支援するための材料を作ります。点数、評価、良し悪し、他人との比較は書かないでください。入力にない事実は作らないでください。指定されたJSONだけを返してください。strengthsSummaryは120字以内の文字列、nextStepsは各80字以内の1〜3件、oneOnOneTopicsは各50字以内の1〜3件です。",
    },
    { role: "user" as const, content: JSON.stringify(input) },
  ];
}

export function createFakeGrowthHintResponse(input: GrowthHintInput) {
  const strength = input.approvedSkills[0];
  const gap = input.skillGaps[0];
  return JSON.stringify({
    strengthsSummary: strength
      ? `${strength.name}のLv${strength.level}を強みに、次の成長へつなげられます。`
      : "承認済みスキルを増やすことから始められます。",
    nextSteps: [
      gap
        ? `${gap.name}をLv${gap.requiredLevel}に近づける実務機会をつくる。`
        : "現在の強みを実務で活かす機会を振り返る。",
    ],
    oneOnOneTopics: [
      gap ? `${gap.name}を伸ばす機会について` : "強みを活かせた場面について",
    ],
  });
}
