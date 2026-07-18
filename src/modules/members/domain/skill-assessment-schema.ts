import { SkillSelfAssessmentStatus } from "@prisma/client";
import { z } from "zod";

import { MAX_SKILL_LEVEL, MIN_SKILL_LEVEL } from "@/shared/domain/skill-level";

export const skillAssessmentInputSchema = z.object({
  memberId: z.string().min(1),
  skillId: z.string().min(1),
  requestedLevel: z.number().int().min(MIN_SKILL_LEVEL).max(MAX_SKILL_LEVEL),
  yearsOfExperience: z.number().min(0).max(99.9).optional()
});

export const skillAssessmentBatchInputSchema = z.object({
  memberId: z.string().min(1),
  assessments: z
    .array(skillAssessmentInputSchema.omit({ memberId: true }))
    .min(1, "申請するスキルを1件以上追加してください。")
    .max(50, "一度に申請できるスキルは50件までです。")
}).superRefine((input, context) => {
  const seenSkillIds = new Set<string>();

  input.assessments.forEach((assessment, index) => {
    if (seenSkillIds.has(assessment.skillId)) {
      context.addIssue({
        code: "custom",
        message: "同じスキルを重複して申請することはできません。",
        path: ["assessments", index, "skillId"]
      });
    }
    seenSkillIds.add(assessment.skillId);
  });
});
export const skillAssessmentReviewInputSchema = z.object({
  assessmentId: z.string().min(1),
  reviewerMemberId: z.string().min(1),
  status: z.enum([
    SkillSelfAssessmentStatus.APPROVED,
    SkillSelfAssessmentStatus.CORRECTED,
    SkillSelfAssessmentStatus.REJECTED
  ]),
  correctedLevel: z.number().int().min(MIN_SKILL_LEVEL).max(MAX_SKILL_LEVEL).optional(),
  managerComment: z.string().max(1000).optional()
}).superRefine((input, context) => {
  if (
    input.status === SkillSelfAssessmentStatus.CORRECTED &&
    input.correctedLevel === undefined
  ) {
    context.addIssue({
      code: "custom",
      message: "correctedLevel is required when status is CORRECTED.",
      path: ["correctedLevel"]
    });
  }
});

export type SkillAssessmentInput = z.infer<typeof skillAssessmentInputSchema>;
export type SkillAssessmentBatchInput = z.infer<typeof skillAssessmentBatchInputSchema>;
export type SkillAssessmentReviewInput = z.infer<
  typeof skillAssessmentReviewInputSchema
>;
