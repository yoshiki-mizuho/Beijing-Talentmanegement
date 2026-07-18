import { z } from "zod";

const optionalBooleanQuerySchema = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}, z.boolean().optional());

export const skillSearchSchema = z.object({
  q: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  isActive: optionalBooleanQuerySchema
});

export type SkillSearchInput = z.infer<typeof skillSearchSchema>;
