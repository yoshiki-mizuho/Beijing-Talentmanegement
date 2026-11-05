import { z } from "zod";

const rawSuggestionSchema = z.object({
  skill: z.number().int(),
  prerequisite: z.number().int(),
  reason: z.string(),
  confidence: z.enum(["high", "low"])
});

const responseSchema = z.object({ suggestions: z.array(rawSuggestionSchema) });

export type SkillPrerequisiteSuggestion = z.infer<typeof rawSuggestionSchema>;

function stripCodeFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function truncateReason(reason: string) {
  const trimmed = reason.trim();
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 59)}…`;
}

export function parseSkillPrerequisiteSuggestions(
  value: string,
  options: {
    validNumbers: ReadonlySet<number>;
    targetNumbers: ReadonlySet<number>;
    existing: readonly { skill: number; prerequisite: number }[];
  }
) {
  const parsed = responseSchema.parse(JSON.parse(stripCodeFence(value)));
  const seen = new Set<string>();
  const existing = new Set(options.existing.flatMap((pair) => [
    `${pair.skill}:${pair.prerequisite}`,
    `${pair.prerequisite}:${pair.skill}`
  ]));
  const result: SkillPrerequisiteSuggestion[] = [];
  for (const item of parsed.suggestions) {
    const key = `${item.skill}:${item.prerequisite}`;
    if (
      result.length >= 30 ||
      item.skill === item.prerequisite ||
      !options.validNumbers.has(item.skill) ||
      !options.validNumbers.has(item.prerequisite) ||
      !options.targetNumbers.has(item.skill) ||
      existing.has(key) ||
      seen.has(key) ||
      item.reason.trim() === ""
    ) continue;
    seen.add(key);
    result.push({ ...item, reason: truncateReason(item.reason) });
  }
  return result;
}
