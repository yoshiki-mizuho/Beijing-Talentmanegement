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
    parsed = JSON.parse(value);
  } catch {
    throw new Error("invalid_ai_response");
  }
  return aiGrowthHintSchema.parse(parsed);
}
