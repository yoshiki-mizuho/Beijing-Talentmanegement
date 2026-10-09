import { z } from "zod";

import { MAX_SKILL_LEVEL, MIN_SKILL_LEVEL } from "@/shared/domain/skill-level";

export const roleInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true)
});

export const roleRequirementInputSchema = z.object({
  roleId: z.string().min(1),
  skillId: z.string().min(1),
  requiredLevel: z.number().int().min(MIN_SKILL_LEVEL).max(MAX_SKILL_LEVEL),
  isRequired: z.boolean().default(true)
});

export type RoleInput = z.infer<typeof roleInputSchema>;
export type RoleRequirementInput = z.infer<typeof roleRequirementInputSchema>;
