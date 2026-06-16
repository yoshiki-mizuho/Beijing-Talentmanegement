import { z } from "zod";

export const skillInputSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  categoryId: z.string().min(1),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true)
});

export const createSkillInputSchema = skillInputSchema.omit({ code: true });

export const skillCategoryInputSchema = z.object({
  name: z.string().min(1).max(120),
  displayOrder: z.number().int().min(0).default(0)
});

export type SkillInput = z.infer<typeof skillInputSchema>;
export type CreateSkillInput = z.infer<typeof createSkillInputSchema>;
export type SkillCategoryInput = z.infer<typeof skillCategoryInputSchema>;
