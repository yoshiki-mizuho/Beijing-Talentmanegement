import { SkillSelfAssessmentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  skillAssessmentBatchInputSchema,
  skillAssessmentInputSchema,
  skillAssessmentReviewInputSchema
} from "@/modules/members/domain/skill-assessment-schema";

describe("skill assessment schemas", () => {
  it("accepts a valid self assessment from level 1 to 5", () => {
    expect(
      skillAssessmentInputSchema.parse({
        memberId: "member-1",
        skillId: "skill-1",
        requestedLevel: 5,
        yearsOfExperience: 3.5
      })
    ).toMatchObject({
      memberId: "member-1",
      skillId: "skill-1",
      requestedLevel: 5,
      yearsOfExperience: 3.5
    });
  });

  it("rejects self assessment skill levels outside 1 to 5", () => {
    expect(() =>
      skillAssessmentInputSchema.parse({
        memberId: "member-1",
        skillId: "skill-1",
        requestedLevel: 6
      })
    ).toThrow();
  });

  it("accepts a batch with unique skills and levels from 1 to 5", () => {
    expect(
      skillAssessmentBatchInputSchema.parse({
        memberId: "member-1",
        assessments: [
          { skillId: "skill-1", requestedLevel: 1 },
          { skillId: "skill-2", requestedLevel: 5, yearsOfExperience: 2.5 }
        ]
      }).assessments
    ).toHaveLength(2);
  });

  it("rejects empty and duplicate skill batches", () => {
    expect(() =>
      skillAssessmentBatchInputSchema.parse({
        memberId: "member-1",
        assessments: []
      })
    ).toThrow("申請するスキルを1件以上追加してください。");

    expect(() =>
      skillAssessmentBatchInputSchema.parse({
        memberId: "member-1",
        assessments: [
          { skillId: "skill-1", requestedLevel: 2 },
          { skillId: "skill-1", requestedLevel: 3 }
        ]
      })
    ).toThrow("同じスキルを重複して申請することはできません。");
  });
  it("accepts approved, corrected, and rejected review statuses", () => {
    for (const status of [
      SkillSelfAssessmentStatus.APPROVED,
      SkillSelfAssessmentStatus.CORRECTED,
      SkillSelfAssessmentStatus.REJECTED
    ]) {
      expect(
        skillAssessmentReviewInputSchema.parse({
          assessmentId: "assessment-1",
          reviewerMemberId: "manager-1",
          reviewerRole: "MANAGER",
          status,
          correctedLevel: 4,
          managerComment: "確認しました。"
        }).status
      ).toBe(status);
    }
  });

  it("requires a corrected level when correcting an assessment", () => {
    expect(() =>
      skillAssessmentReviewInputSchema.parse({
        assessmentId: "assessment-1",
        reviewerMemberId: "manager-1",
        reviewerRole: "MANAGER",
        status: SkillSelfAssessmentStatus.CORRECTED
      })
    ).toThrow();
  });

  it("requires a reason when rejecting an assessment", () => {
    expect(() =>
      skillAssessmentReviewInputSchema.parse({
        assessmentId: "assessment-1",
        reviewerMemberId: "manager-1",
        reviewerRole: "MANAGER",
        status: SkillSelfAssessmentStatus.REJECTED
      })
    ).toThrow("差し戻す場合は理由を入力してください。");
  });
});
