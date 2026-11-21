import { AuthRole } from "@prisma/client";

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
import { buildDepartmentTree } from "@/modules/members/domain/department-hierarchy";
import { displayMemberName } from "@/modules/members/domain/member-display";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { paginateItems } from "@/modules/members/domain/member-page";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import type {
  MemberListData,
  MemberListItem,
  MemberRow
} from "@/modules/members/presentation/member-presentation-types";

export const MEMBER_PAGE_SIZE = 20;

export async function listDepartments() {
  return buildDepartmentTree(await memberRepository.listDepartments()).map(
    ({ pathLabel, ...department }) => ({ ...department, name: pathLabel })
  );
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

export async function listMemberPage(
  input?: unknown,
  memberIds?: string[]
): Promise<MemberListData> {
  const parsed = input ? memberSearchSchema.parse(input) : memberSearchSchema.parse({});
  const members = await memberRepository.listMembers(parsed, memberIds);
  const filtered = members.filter((member) => matchesTargetRole(member, parsed.targetRole));
  const result = paginateItems(filtered, parsed.page ?? 1, MEMBER_PAGE_SIZE);
  return { ...result, items: result.items.map(toMemberListItem) };
}

export async function getMemberDetail(memberId: string): Promise<MemberRow | null> {
  const member = await memberRepository.getMemberById(memberId);
  return member ? toMemberRow(member) : null;
}

type TargetRoleFilterMember = {
  targetRoleId: string | null;
  targetRole: {
    roleRequirements: Parameters<typeof evaluateRoleAchievement>[0];
  } | null;
  roleAchievements: { roleId: string }[];
  memberSkills: Parameters<typeof evaluateRoleAchievement>[1];
};

export function matchesTargetRole(
  member: TargetRoleFilterMember,
  filter?: "unset" | "achieved" | "in_progress"
) {
  if (!filter) return true;
  if (!member.targetRole) return filter === "unset";
  const recorded = member.roleAchievements.some(
    (achievement) => achievement.roleId === member.targetRoleId
  );
  if (filter === "achieved") return recorded;
  if (filter === "in_progress") {
    const evaluation = evaluateRoleAchievement(
      member.targetRole.roleRequirements,
      member.memberSkills
    );
    return !recorded && evaluation !== null;
  }
  return false;
}

function toMemberListItem(
  member: Awaited<ReturnType<typeof memberRepository.listMembers>>[number]
): MemberListItem {
  return omitMemberDetailFields(toMemberRow(member));
}

export function omitMemberDetailFields(member: MemberRow): MemberListItem {
  const { pendingAssessments, ...memberWithDetail } = member;
  const item = { ...memberWithDetail } as unknown as MemberListItem;
  delete (item as Partial<MemberRow>).email;
  delete (item as Partial<MemberRow>).profile;
  delete (item as Partial<MemberRow>).managerId;
  delete (item as Partial<MemberRow>).manager;
  return {
    ...item,
    pendingAssessmentCount: pendingAssessments?.length ?? 0
  };
}

function toMemberRow(
  member: Awaited<ReturnType<typeof memberRepository.listMembers>>[number]
): MemberRow {
  return {
    id: member.id,
    employeeNo: member.employeeNo ?? "",
    name: displayMemberName(member.name),
    avatarUpdatedAt: member.avatarUpdatedAt?.toISOString() ?? null,
    email: member.email ?? "",
    profile: member.profile,
    status: member.status,
    jobTitle: member.jobTitle,
    departmentId: member.departmentId ?? "",
    department: member.department ?? { id: "", name: "", code: "", tenantId: "", parentDepartmentId: null, isActive: true, createdAt: new Date(0), updatedAt: new Date(0) },
    managerId: null,
    manager: null,
    targetRoleId: member.targetRoleId,
    targetRole: member.targetRole
      ? {
          id: member.targetRole.id,
          name: member.targetRole.name,
          isActive: member.targetRole.isActive
        }
      : null,
    growthHint: member.growthHint
      ? { generatedAt: member.growthHint.generatedAt.toISOString() }
      : null,
    roleAchievements: member.roleAchievements.map((achievement) => ({
      roleId: achievement.roleId,
      achievedAt: achievement.achievedAt.toISOString()
    })),
    role: null,
    platformUserId: member.platformUserId,
    pendingAssessments: member.selfAssessments,
    memberSkills: member.memberSkills.map((memberSkill) => ({
      id: memberSkill.id,
      skillId: memberSkill.skillId,
      level: memberSkill.level,
      skill: {
        id: memberSkill.skill.id,
        name: memberSkill.skill.name,
        category: { name: memberSkill.skill.category.name }
      }
    }))
  };
}

export function getGrowthHintMemberContext(memberId: string, since: Date) {
  return memberRepository.getGrowthHintMemberContext(memberId, since);
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

export function updateMemberRole(
  memberId: string,
  role: unknown,
  actorMemberId: string
) {
  if (!Object.values(AuthRole).includes(role as AuthRole)) {
    throw new Error("Invalid role");
  }
  return memberRepository.updateMemberRole(memberId, role as AuthRole, actorMemberId);
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

export async function listPendingSkillAssessments(
  reviewerRole: AuthRole,
  reviewerMemberId: string
) {
  const scope = await getMemberScope(reviewerRole, reviewerMemberId);
  return memberRepository.listPendingSkillAssessments(
    reviewerRole,
    scope.memberIds
  );
}

export async function countPendingSkillAssessments(
  reviewerRole: AuthRole,
  reviewerMemberId: string
) {
  const scope = await getMemberScope(reviewerRole, reviewerMemberId);
  return memberRepository.countPendingSkillAssessments(
    reviewerRole,
    scope.memberIds
  );
}

export function getSkillApprovalInsightContext(
  assessments: Parameters<
    typeof memberRepository.getSkillApprovalInsightContext
  >[0]
) {
  return memberRepository.getSkillApprovalInsightContext(assessments);
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
export async function reviewSkillAssessment(input: unknown) {
  const parsed = skillAssessmentReviewInputSchema.parse(input);
  await assertAssessmentScope(
    [parsed.assessmentId],
    parsed.reviewerRole,
    parsed.reviewerMemberId
  );
  return memberRepository.reviewSkillAssessment(parsed);
}

export async function approveSkillAssessments(input: unknown) {
  const parsed = skillAssessmentApprovalBatchInputSchema.parse(input);
  await assertAssessmentScope(
    parsed.assessmentIds,
    parsed.reviewerRole,
    parsed.reviewerMemberId
  );
  return memberRepository.approveSkillAssessments(parsed);
}

async function assertAssessmentScope(
  assessmentIds: string[],
  reviewerRole: AuthRole,
  reviewerMemberId: string
) {
  if (reviewerRole === "ADMIN") return;
  const [scope, assessments] = await Promise.all([
    getMemberScope(reviewerRole, reviewerMemberId),
    memberRepository.getAssessmentMemberIds(assessmentIds)
  ]);
  if (
    assessments.length !== assessmentIds.length ||
    assessments.some((assessment) => !scope.memberIds.includes(assessment.memberId))
  ) {
    throw new Error("skill_assessment_forbidden");
  }
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
