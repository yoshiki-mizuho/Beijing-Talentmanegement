import type { AuthRole } from "@prisma/client";

import { badgeDefinitions } from "@/modules/growth/domain/badge-art";
import { calculateBadgeAchievements, getTokyoMonthKey } from "@/modules/growth/domain/growth-insights";
import { isGrowthLevelChange } from "@/modules/growth/domain/level-change-source";
import {
  buildMonthlyRecap,
  getViewableRecapMonths,
  shiftMonth,
  shouldShowMonthlyRecap
} from "@/modules/growth/domain/monthly-recap";
import {
  getMemberGrowthData,
  listMonthlyRecapAssessments
} from "@/modules/growth/infrastructure/member-growth-repository";
import { getBadgeCalculationData } from "@/modules/growth/infrastructure/badge-calculation-repository";
import { prisma } from "@/server/db/prisma";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";
import { AuthorizationError } from "@/server/auth/authorization";
import { listMemberRoleAchievements } from "@/modules/roles/application/role-achievement-service";

export async function getMonthlyRecap(memberId: string, requestedMonth?: string, now: Date = new Date()) {
  const [data, recapAssessments, badgeData, roleAchievements] = await Promise.all([
    getMemberGrowthData(memberId),
    listMonthlyRecapAssessments(memberId),
    getBadgeCalculationData(memberId),
    listMemberRoleAchievements(memberId)
  ]);
  if (!data.member) return null;
  const months = getViewableRecapMonths(data.member.createdAt, now);
  const latestCompletedMonth = shiftMonth(getTokyoMonthKey(now), -1);
  const month = requestedMonth && months.includes(requestedMonth)
    ? requestedMonth
    : latestCompletedMonth;
  const achievements = calculateBadgeAchievements({
    ...badgeData,
    targetAchievements: roleAchievements
  });
  const badgeNameById = new Map(badgeDefinitions.map((badge) => [badge.id, badge.name]));
  const voices = [
    ...data.receivedCheers.map((cheer) => ({
      kind: "cheer" as const,
      createdAt: cheer.createdAt,
      senderId: cheer.fromMember.id,
      senderName: cheer.fromMember.name,
      text: cheer.message
    })),
    ...data.levelChanges
      .filter((change) =>
        isGrowthLevelChange(change.source) &&
        change.toLevel !== null &&
        (change.fromLevel === null || change.toLevel > change.fromLevel)
      )
      .flatMap((change) => change.reactions.map((reaction) => ({
      kind: "reaction" as const,
      createdAt: reaction.createdAt,
      senderId: reaction.member.id,
      senderName: reaction.member.name,
      reactionType: reaction.type
      }))),
    ...data.levelChanges
      .filter((change) =>
        isGrowthLevelChange(change.source) &&
        change.toLevel !== null &&
        (change.fromLevel === null || change.toLevel > change.fromLevel)
      )
      .flatMap((change) => change.comments.map((comment) => ({
      kind: "comment" as const,
      createdAt: comment.createdAt,
      senderId: comment.authorMember.id,
      senderName: comment.authorMember.name,
      text: comment.body
      })))
  ];
  const recap = buildMonthlyRecap({
    memberId,
    memberCreatedAt: data.member.createdAt,
    month,
    latestCompletedMonth,
    currentSkills: data.member.memberSkills.map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skill.name,
      level: skill.level
    })),
    levelChanges: data.levelChanges.map((change) => ({
      id: change.id,
      skillId: change.skillId,
      skillName: change.skill.name,
      fromLevel: change.fromLevel,
      toLevel: change.toLevel,
      source: change.source,
      changedAt: change.changedAt,
      reactionCount: change._count.reactions,
      commentCount: change._count.comments,
      isFirstMover: badgeData.firstMoverLevelChangeIds.includes(change.id)
    })),
    assessments: recapAssessments.map((assessment) => ({
      skillId: assessment.skillId,
      skillName: assessment.skill.name,
      status: assessment.status,
      createdAt: assessment.createdAt
    })),
    voices,
    badges: achievements.map((badge) => ({
      ...badge,
      name: badgeNameById.get(badge.id) ?? badge.id
    })),
    targetRole: data.member.targetRole ? {
      name: data.member.targetRole.name,
      requirements: data.member.targetRole.roleRequirements.map((requirement) => ({
        skillId: requirement.skillId,
        skillName: requirement.skill.name,
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired,
        anyOfGroup: requirement.anyOfGroup
      }))
    } : null
  });
  return {
    member: {
      id: data.member.id,
      name: data.member.name,
      createdAt: data.member.createdAt.toISOString(),
      lastRecapSeenMonth: data.member.lastRecapSeenMonth
    },
    months,
    recap
  };
}

export async function getMonthlyRecapCelebration(memberId: string, now: Date = new Date()) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { createdAt: true, lastRecapSeenMonth: true }
  });
  if (!member || !shouldShowMonthlyRecap({
    memberCreatedAt: member.createdAt,
    now,
    lastRecapSeenMonth: member.lastRecapSeenMonth,
    hasEvents: true
  })) return null;
  const result = await getMonthlyRecap(memberId, undefined, now);
  if (!result || !shouldShowMonthlyRecap({
    memberCreatedAt: result.member.createdAt,
    now,
    lastRecapSeenMonth: result.member.lastRecapSeenMonth,
    hasEvents: result.recap.hasEvents
  })) return null;
  return result.recap;
}

export async function getManagedMemberMonthlyRecap(
  memberId: string,
  requestedMonth: string | undefined,
  viewer: { memberId: string; role: AuthRole }
) {
  if (viewer.role !== "ADMIN") {
    if (viewer.role !== "MANAGER") {
      throw new AuthorizationError("振り返りを見る権限がありません。", 403);
    }
    const scope = await getMemberScope(viewer.role, viewer.memberId);
    if (!memberIsInScope(scope, memberId)) {
      throw new AuthorizationError("振り返りを見る権限がありません。", 403);
    }
  }
  return getMonthlyRecap(memberId, requestedMonth);
}

export function markMonthlyRecapSeen(memberId: string, month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("月の形式が正しくありません。");
  }
  return prisma.member.update({
    where: { id: memberId },
    data: { lastRecapSeenMonth: month },
    select: { id: true }
  });
}
