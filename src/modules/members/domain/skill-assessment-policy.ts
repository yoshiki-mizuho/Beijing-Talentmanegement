export function canReviewSkillAssessment(input: {
  reviewerRole: "ADMIN" | "MANAGER";
  reviewerMemberId: string;
  applicantManagerId: string | null;
}) {
  return input.reviewerRole === "ADMIN" ||
    input.applicantManagerId === null ||
    input.applicantManagerId === input.reviewerMemberId;
}
