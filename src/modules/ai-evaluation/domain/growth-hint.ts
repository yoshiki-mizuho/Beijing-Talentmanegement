import { z } from "zod";

export const aiGrowthHintSchema = z.object({
  strengthsSummary: z.string().min(1).max(120),
  nextSteps: z.array(z.string().min(1).max(80)).min(1).max(3),
  oneOnOneTopics: z.array(z.string().min(1).max(50)).min(1).max(3),
});

export const growthHintContentSchema = aiGrowthHintSchema.extend({
  strengths: z.array(
    z.object({
      skillId: z.string(),
      name: z.string(),
      level: z.number().int().min(1).max(5),
    }),
  ),
  skillGaps: z.array(
    z.object({
      skillId: z.string(),
      name: z.string(),
      currentLevel: z.number().int().min(0).max(5),
      requiredLevel: z.number().int().min(1).max(5),
    }),
  ),
  targetRoleName: z.string().nullable(),
  mentor: z
    .object({ memberId: z.string(), name: z.string(), skillName: z.string() })
    .nullable(),
});

export type AiGrowthHint = z.infer<typeof aiGrowthHintSchema>;
export type GrowthHintContent = z.infer<typeof growthHintContentSchema>;

export function parseAiGrowthHint(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapJsonCodeBlock(value));
  } catch {
    throw new Error("invalid_ai_response");
  }

  const normalized = z
    .object({
      strengthsSummary: z.string(),
      nextSteps: z.array(z.string()),
      oneOnOneTopics: z.array(z.string()),
    })
    .parse(parsed);

  return aiGrowthHintSchema.parse({
    strengthsSummary: truncate(normalized.strengthsSummary, 120),
    nextSteps: normalizeItems(normalized.nextSteps, 80),
    oneOnOneTopics: normalizeItems(normalized.oneOnOneTopics, 50),
  });
}

function unwrapJsonCodeBlock(value: string) {
  const match = value.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : value;
}

function normalizeItems(items: string[], maxLength: number) {
  return items
    .filter((item) => item.trim().length > 0)
    .slice(0, 3)
    .map((item) => truncate(item, maxLength));
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}
