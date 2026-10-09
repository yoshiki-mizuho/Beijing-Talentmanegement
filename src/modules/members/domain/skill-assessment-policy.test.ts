import { describe, expect, it } from "vitest";

import { canReviewSkillAssessment } from "@/modules/members/domain/skill-assessment-policy";

describe("canReviewSkillAssessment", () => {
  it("allows an admin to review every application", () => {
    expect(canReviewSkillAssessment({
      reviewerRole: "ADMIN",
      reviewerMemberId: "admin",
      applicantManagerId: "other-manager"
    })).toBe(true);
  });

  it("allows a manager to review direct reports and members without a manager", () => {
    expect(canReviewSkillAssessment({
      reviewerRole: "MANAGER",
      reviewerMemberId: "manager",
      applicantManagerId: "manager"
    })).toBe(true);
    expect(canReviewSkillAssessment({
      reviewerRole: "MANAGER",
      reviewerMemberId: "manager",
      applicantManagerId: null
    })).toBe(true);
  });

  it("rejects a manager reviewing another manager's report", () => {
    expect(canReviewSkillAssessment({
      reviewerRole: "MANAGER",
      reviewerMemberId: "manager",
      applicantManagerId: "other-manager"
    })).toBe(false);
  });
});
