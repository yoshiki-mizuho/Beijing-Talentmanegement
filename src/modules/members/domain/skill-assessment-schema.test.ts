import { SkillSelfAssessmentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
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
          status,
          correctedLevel: 4
        }).status
      ).toBe(status);
    }
  });

  it("requires a corrected level when correcting an assessment", () => {
    expect(() =>
      skillAssessmentReviewInputSchema.parse({
        assessmentId: "assessment-1",
        reviewerMemberId: "manager-1",
        status: SkillSelfAssessmentStatus.CORRECTED
      })
    ).toThrow();
  });
});
