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
  skillAssessmentApprovalBatchInputSchema,
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

export function listMembers(input?: MemberSearchInput, memberIds?: string[]) {
  return memberRepository.listMembers(
    input ? memberSearchSchema.parse(input) : undefined,
    memberIds
  );
}

export function createMember(input: unknown, actorMemberId: string | null) {
  return memberRepository.createMember(memberInputSchema.parse(input), actorMemberId);
}

export function updateMember(id: string, input: unknown, actorMemberId: string | null) {
  return memberRepository.updateMember(id, memberInputSchema.parse(input), actorMemberId);
}

export function deactivateMember(id: string, actorMemberId: string | null) {
  return memberRepository.deactivateMember(id, actorMemberId);
}

export function setMemberSkillLevel(input: unknown, actorMemberId: string | null) {
  return memberRepository.upsertMemberSkill(memberSkillInputSchema.parse(input), actorMemberId);
}

export function removeMemberSkill(memberId: string, skillId: string, actorMemberId: string | null) {
  return memberRepository.removeMemberSkill(memberId, skillId, actorMemberId);
}

export function listMemberSkillAssessments(memberId: string) {
  return memberRepository.listMemberSkillAssessments(memberId);
}

export function getMemberSkillSheetContext(memberId: string) {
  return memberRepository.getMemberSkillSheetContext(memberId);
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

export function createSkillAssessment(input: unknown, actorMemberId: string | null) {
  return memberRepository.createSkillAssessment(
    skillAssessmentInputSchema.parse(input),
    actorMemberId
  );
}

export function createSkillAssessments(input: unknown, actorMemberId: string | null) {
  return memberRepository.createSkillAssessments(
    skillAssessmentBatchInputSchema.parse(input), actorMemberId
  );
}
export function reviewSkillAssessment(input: unknown) {
  return memberRepository.reviewSkillAssessment(
    skillAssessmentReviewInputSchema.parse(input)
  );
}

export function approveSkillAssessments(input: unknown) {
  return memberRepository.approveSkillAssessments(
    skillAssessmentApprovalBatchInputSchema.parse(input)
  );
}

export function updateMemberManager(input: unknown, actorMemberId: string | null) {
  return memberRepository.updateMemberManager(
    memberManagerInputSchema.parse(input), actorMemberId
  );
}

export function updateMemberTargetRole(input: unknown, actorMemberId: string | null) {
  return memberRepository.updateMemberTargetRole(
    memberTargetRoleInputSchema.parse(input), actorMemberId
  );
}
