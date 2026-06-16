import { memberInputSchema, memberSkillInputSchema } from "@/modules/members/domain/member-schema";
import {
  skillAssessmentInputSchema,
  skillAssessmentReviewInputSchema
} from "@/modules/members/domain/skill-assessment-schema";
import * as memberRepository from "@/modules/members/infrastructure/member-repository";

export function listDepartments() {
  return memberRepository.listDepartments();
}

export function listMembers() {
  return memberRepository.listMembers();
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

export function listPendingSkillAssessments() {
  return memberRepository.listPendingSkillAssessments();
}

export function createSkillAssessment(input: unknown) {
  return memberRepository.createSkillAssessment(skillAssessmentInputSchema.parse(input));
}

export function reviewSkillAssessment(input: unknown) {
  return memberRepository.reviewSkillAssessment(
    skillAssessmentReviewInputSchema.parse(input)
  );
}
