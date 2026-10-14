import { z } from "zod";

export const skillInputSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  categoryId: z.string().trim().min(1),
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true)
});

export const createSkillInputSchema = skillInputSchema.omit({ code: true });

export const skillCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  displayOrder: z.number().int().min(0).default(0)
});

export const skillLevelGuidesInputSchema = z.object({
  guides: z
    .array(
      z.object({
        level: z.number().int().min(1).max(5),
        description: z.string().trim().max(300)
      })
    )
    .length(5)
    .refine((guides) => new Set(guides.map((guide) => guide.level)).size === 5, {
      message: "Lv1〜Lv5を1件ずつ指定してください。"
    })
});

export type SkillInput = z.infer<typeof skillInputSchema>;
export type CreateSkillInput = z.infer<typeof createSkillInputSchema>;
export type SkillCategoryInput = z.infer<typeof skillCategoryInputSchema>;
export type SkillLevelGuidesInput = z.infer<typeof skillLevelGuidesInputSchema>;
