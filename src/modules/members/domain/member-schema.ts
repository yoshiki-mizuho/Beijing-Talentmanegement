import { z } from "zod";

import { MAX_SKILL_LEVEL, MIN_SKILL_LEVEL } from "@/shared/domain/skill-level";

export const memberSkillInputSchema = z.object({
  memberId: z.string().min(1),
  skillId: z.string().min(1),
  level: z.number().int().min(MIN_SKILL_LEVEL).max(MAX_SKILL_LEVEL),
  changedByMemberId: z.string().min(1)
});

export const memberTargetRoleInputSchema = z.object({
  memberId: z.string().min(1),
  targetRoleId: z.string().min(1).nullable()
});

export type MemberSkillInput = z.infer<typeof memberSkillInputSchema>;
export type MemberTargetRoleInput = z.infer<typeof memberTargetRoleInputSchema>;
