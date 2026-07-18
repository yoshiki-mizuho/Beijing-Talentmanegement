import { MemberStatus } from "@prisma/client";
import { z } from "zod";

const optionalSkillLevelQuerySchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : value),
  z.coerce.number().int().min(1).max(5).optional()
);

export const memberSearchSchema = z.object({
  q: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  skillId: z.string().trim().optional(),
  minLevel: optionalSkillLevelQuerySchema,
  roleId: z.string().trim().optional(),
  status: z.enum(MemberStatus).optional()
});

export type MemberSearchInput = z.infer<typeof memberSearchSchema>;
