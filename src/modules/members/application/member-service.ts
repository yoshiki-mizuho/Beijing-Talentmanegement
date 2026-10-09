import type { AuthRole } from "@prisma/client";

import {
  memberInputSchema,
  memberManagerInputSchema,
  memberSkillInputSchema,
  memberTargetRoleInputSchema
} from "@/modules/members/domain/member-schema";
import {
  type MemberSearchInput,
  memberSearchSchema
} from "@/modules/members/domain/member-search";
import {
  skillAssessmentBatchInputSchema,
  skillAssessmentInputSchema,
  skillAssessmentReviewInputSchema
} from "@/modules/members/domain/skill-assessment-schema";
import * as memberRepository from "@/modules/members/infrastructure/member-repository";

export function listDepartments() {
  return memberRepository.listDepartments();
}

export function listManagerCandidates() {
  return memberRepository.listManagerCandidates();
}

export function listMembers(input?: MemberSearchInput) {
  return memberRepository.listMembers(
    input ? memberSearchSchema.parse(input) : undefined
  );
}

export function createMember(input: unknown) {
  return memberRepository.createMember(memberInputSchema.parse(input));
}

export function updateMember(id: string, input: unknown) {
  return memberRepository.updateMember(id, memberInputSchema.parse(input));
}

export function deactivateMember(id: string) {
  return memberRepository.deactivateMember(id);
}

export function setMemberSkillLevel(input: unknown) {
  return memberRepository.upsertMemberSkill(memberSkillInputSchema.parse(input));
}

export function removeMemberSkill(memberId: string, skillId: string) {
  return memberRepository.removeMemberSkill(memberId, skillId);
}

export function listMemberSkillAssessments(memberId: string) {
  return memberRepository.listMemberSkillAssessments(memberId);
}

export function listPendingSkillAssessments(
  reviewerRole: AuthRole,
  reviewerMemberId: string
) {
  return memberRepository.listPendingSkillAssessments(
    reviewerRole,
    reviewerMemberId
  );
}

export function countPendingSkillAssessments(
  reviewerRole: AuthRole,
  reviewerMemberId: string
) {
  return memberRepository.countPendingSkillAssessments(
    reviewerRole,
    reviewerMemberId
  );
}

export function countMemberSkillAssessments(memberId: string) {
  return memberRepository.countMemberSkillAssessments(memberId);
}

export function countMemberSkills(memberId: string) {
  return memberRepository.countMemberSkills(memberId);
}

export function hasMemberTargetRole(memberId: string) {
  return memberRepository.hasMemberTargetRole(memberId);
}

export function createSkillAssessment(input: unknown) {
  return memberRepository.createSkillAssessment(skillAssessmentInputSchema.parse(input));
}

export function createSkillAssessments(input: unknown) {
  return memberRepository.createSkillAssessments(
    skillAssessmentBatchInputSchema.parse(input)
  );
}
export function reviewSkillAssessment(input: unknown) {
  return memberRepository.reviewSkillAssessment(
    skillAssessmentReviewInputSchema.parse(input)
  );
}

export function updateMemberManager(input: unknown) {
  return memberRepository.updateMemberManager(
    memberManagerInputSchema.parse(input)
  );
}

export function updateMemberTargetRole(input: unknown) {
  return memberRepository.updateMemberTargetRole(
    memberTargetRoleInputSchema.parse(input)
  );
}
