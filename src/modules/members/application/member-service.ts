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
import {
  fallbackMemberProfile,
  resolveMemberProfiles,
  type MemberProfile
} from "@/modules/members/application/member-directory";
import { getMemberScope } from "@/modules/members/application/member-scope";
import { paginateItems } from "@/modules/members/domain/member-page";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import type {
  MemberListData,
  MemberListItem,
  MemberRow
} from "@/modules/members/presentation/member-presentation-types";
import { getCurrentSession } from "@/server/auth/session";
import { getLeaderScope, getOrganization } from "@/server/platform/directory";

export const MEMBER_PAGE_SIZE = 20;

export async function listDepartments() {
  const session = await getCurrentSession();
  if (!session) return [];
  try {
    const organization = await getOrganization(session.user.platformUserId);
    const allowedNodeIds = session.user.role === "ADMIN"
      ? null
      : new Set((await getLeaderScope(session.user.platformUserId)).nodeIds);
    return organization.nodes
      .filter((node) => !allowedNodeIds || allowedNodeIds.has(node.id))
      .map((node) => ({ id: node.id, name: node.name }))
      .sort((left, right) => left.name.localeCompare(right.name, "ja"));
  } catch {
    return [];
  }
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
  const profiles = await resolveMemberProfiles(members.map((member) => member.id));
  const selectedNodeIds = await organizationNodeAndDescendants(parsed.nodeId);
  const query = parsed.q?.toLocaleLowerCase("ja") ?? "";
  const filtered = members
    .filter((member) => matchesTargetRole(member, parsed.targetRole))
    .filter((member) => {
      const profile = profiles.get(member.id) ?? fallbackMemberProfile(member.id);
      return (!query || profile.name.toLocaleLowerCase("ja").includes(query)) &&
        (!selectedNodeIds || (profile.nodeId !== null && selectedNodeIds.has(profile.nodeId)));
    })
    .sort((left, right) => {
      const leftName = profiles.get(left.id)?.name ?? "";
      const rightName = profiles.get(right.id)?.name ?? "";
      return leftName.localeCompare(rightName, "ja") || left.id.localeCompare(right.id);
    });
  const result = paginateItems(filtered, parsed.page ?? 1, MEMBER_PAGE_SIZE);
  return {
    ...result,
    items: result.items.map((member) =>
      toMemberListItem(member, profiles.get(member.id) ?? fallbackMemberProfile(member.id))
    )
  };
}

async function organizationNodeAndDescendants(nodeId?: string) {
  if (!nodeId) return null;
  const session = await getCurrentSession();
  if (!session) return new Set<string>();
  try {
    const organization = await getOrganization(session.user.platformUserId);
    const selected = new Set([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of organization.nodes) {
        if (node.parentId && selected.has(node.parentId) && !selected.has(node.id)) {
          selected.add(node.id);
          changed = true;
        }
      }
    }
    return selected;
  } catch {
    return new Set<string>();
  }
}

export async function getMemberDetail(memberId: string): Promise<MemberRow | null> {
  const member = await memberRepository.getMemberById(memberId);
  if (!member) return null;
  const profiles = await resolveMemberProfiles([member.id]);
  return toMemberRow(member, profiles.get(member.id) ?? fallbackMemberProfile(member.id));
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
  member: Awaited<ReturnType<typeof memberRepository.listMembers>>[number],
  profile: MemberProfile
): MemberListItem {
  return omitMemberDetailFields(toMemberRow(member, profile));
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
  member: Awaited<ReturnType<typeof memberRepository.listMembers>>[number],
  profile: MemberProfile
): MemberRow {
  return {
    id: member.id,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    avatarColor: profile.avatarColor,
    email: profile.email,
    profile: member.profile,
    status: member.status,
    nodeId: profile.nodeId,
    organizationNode: profile.nodeId
      ? { id: profile.nodeId, name: profile.nodeName ?? "所属未設定" }
      : null,
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
