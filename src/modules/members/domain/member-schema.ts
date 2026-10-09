import { MemberStatus } from "@prisma/client";
import { z } from "zod";

import { MAX_SKILL_LEVEL, MIN_SKILL_LEVEL } from "@/shared/domain/skill-level";

export const memberInputSchema = z.object({
  employeeNo: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email().max(255)
  ),
  departmentId: z.string().min(1),
  jobTitle: z.string().max(120).optional(),
  profile: z.string().max(1000).optional(),
  status: z.enum(MemberStatus).default(MemberStatus.ACTIVE)
});

export const memberSkillInputSchema = z.object({
  memberId: z.string().min(1),
  skillId: z.string().min(1),
  level: z.number().int().min(MIN_SKILL_LEVEL).max(MAX_SKILL_LEVEL),
  changedByMemberId: z.string().min(1)
});

export const memberManagerInputSchema = z.object({
  memberId: z.string().min(1),
  managerId: z.string().min(1).nullable()
});

export const memberTargetRoleInputSchema = z.object({
  memberId: z.string().min(1),
  targetRoleId: z.string().min(1).nullable()
});

export type MemberInput = z.infer<typeof memberInputSchema>;
export type MemberSkillInput = z.infer<typeof memberSkillInputSchema>;
export type MemberManagerInput = z.infer<typeof memberManagerInputSchema>;
export type MemberTargetRoleInput = z.infer<typeof memberTargetRoleInputSchema>;
