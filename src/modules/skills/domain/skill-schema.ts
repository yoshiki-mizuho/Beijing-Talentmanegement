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
  name: z.string().trim().min(1).max(120)
});

export const reorderSkillsInputSchema = z.object({
  categories: z.array(z.object({
    categoryId: z.string().trim().min(1),
    skillIds: z.array(z.string().trim().min(1))
  })).min(1)
}).superRefine((input, context) => {
  const categoryIds = input.categories.map((category) => category.categoryId);
  const skillIds = input.categories.flatMap((category) => category.skillIds);
  if (new Set(categoryIds).size !== categoryIds.length || new Set(skillIds).size !== skillIds.length) {
    context.addIssue({
      code: "custom",
      message: "一覧が更新されています。画面を開き直してください。"
    });
  }
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

export const commonSkillLevelGuidesInputSchema = z.object({
  guides: z
    .array(
      z.object({
        level: z.number().int().min(1).max(5),
        description: z.string().trim().min(1).max(200)
      })
    )
    .length(5)
    .refine(
      (guides) =>
        new Set(guides.map((guide) => guide.level)).size === 5 &&
        guides.every((guide) => guide.level >= 1 && guide.level <= 5),
      { message: "Lv1〜Lv5を1件ずつ指定してください。" }
    )
});

export type SkillInput = z.infer<typeof skillInputSchema>;
export type CreateSkillInput = z.infer<typeof createSkillInputSchema>;
export type SkillCategoryInput = z.infer<typeof skillCategoryInputSchema>;
export type SkillLevelGuidesInput = z.infer<typeof skillLevelGuidesInputSchema>;
export type CommonSkillLevelGuidesInput = z.infer<typeof commonSkillLevelGuidesInputSchema>;
export type ReorderSkillsInput = z.infer<typeof reorderSkillsInputSchema>;
