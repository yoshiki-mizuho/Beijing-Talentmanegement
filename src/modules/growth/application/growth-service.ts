import type { AuthRole } from "@prisma/client";

import { badgeDefinitions } from "@/modules/growth/domain/badge-art";
import {
  cheerInputSchema,
  levelUpCommentInputSchema,
  levelUpReactionInputSchema,
  oneOnOneNoteInputSchema,
  oneOnOneNoteUpdateInputSchema
} from "@/modules/growth/domain/growth-schema";
import { calculateBadgeAchievements } from "@/modules/growth/domain/growth-insights";
import * as growthRepository from "@/modules/growth/infrastructure/growth-repository";
import {
  getMemberGrowthData as fetchMemberGrowthData,
  listUnreadLevelUpNotifications
} from "@/modules/growth/infrastructure/member-growth-repository";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import { AuthorizationError } from "@/server/auth/authorization";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export async function addLevelUpReaction(
  input: unknown,
  viewer: { memberId: string; role: AuthRole }
) {
  const parsed = levelUpReactionInputSchema.parse(input);
  await assertLevelUpInteractionAccess(parsed.levelChangeId, viewer, true);
  return growthRepository.addLevelUpReaction(parsed);
}

export async function removeLevelUpReaction(
  input: unknown,
  viewer: { memberId: string; role: AuthRole }
) {
  const parsed = levelUpReactionInputSchema.parse(input);
  await assertLevelUpInteractionAccess(parsed.levelChangeId, viewer, true);
  return growthRepository.removeLevelUpReaction(parsed);
}

export async function createLevelUpComment(
  input: unknown,
  viewer: { memberId: string; role: AuthRole }
) {
  const parsed = levelUpCommentInputSchema.parse(input);
  await assertLevelUpInteractionAccess(parsed.levelChangeId, viewer, false);
  return growthRepository.createLevelUpComment(parsed);
}

export async function getDepartmentLevelUpFeed(
  viewerMemberId: string,
  limit = 5
) {
  const memberIds = await growthRepository.listDepartmentMemberIds(viewerMemberId);
  return growthRepository.listLevelUpFeed({
    memberIds,
    viewerMemberId,
    limit
  });
}

export function getLevelUpFeed(input: {
  memberIds: string[];
  viewerMemberId: string;
  start: Date;
  end: Date;
  limit?: number;
}) {
  return growthRepository.listLevelUpFeed({ ...input, limit: input.limit ?? 10 });
}

export function createCheer(input: unknown) {
  return growthRepository.createCheer(cheerInputSchema.parse(input));
}

export function createOneOnOneNote(input: unknown) {
  return growthRepository.createOneOnOneNote(
    oneOnOneNoteInputSchema.parse(input)
  );
}

export function updateOneOnOneNote(input: unknown) {
  return growthRepository.updateOneOnOneNote(
    oneOnOneNoteUpdateInputSchema.parse(input)
  );
}

export function listOneOnOneNotes(
  managerMemberId: string,
  memberId?: string
) {
  return growthRepository.listOneOnOneNotes(managerMemberId, memberId);
}

export function toggleOneOnOneNoteDiscussed(
  id: string,
  managerMemberId: string
) {
  return growthRepository.toggleOneOnOneNoteDiscussed(id, managerMemberId);
}

export function getMemberGrowthData(memberId: string) {
  return fetchMemberGrowthData(memberId);
}

export async function getLevelUpCelebrations(memberId: string) {
  const [notifications, growthData] = await Promise.all([
    listUnreadLevelUpNotifications(memberId),
    fetchMemberGrowthData(memberId)
  ]);
  if (!growthData.member) return [];

  const achievements = calculateBadgeAchievements({
    assessments: growthData.assessments,
    memberSkills: growthData.member.memberSkills,
    levelChanges: growthData.levelChanges,
    targetRequirements:
      growthData.member.targetRole?.roleRequirements ?? [],
    mentoredCheers: growthData.mentoredCheers
  });
  const progress = buildTargetProgress(growthData);
  const levelDescriptions = new Map(
    growthData.levelDefinitions.map((item) => [item.level, item.description])
  );

  return notifications.flatMap((notification) => {
    const assessment = notification.skillSelfAssessment;
    const levelChange =
      notification.skillLevelChange ?? assessment?.skillLevelChanges[0];
    if (
      !levelChange ||
      (levelChange.fromLevel !== null &&
        levelChange.toLevel <= levelChange.fromLevel)
    ) {
      return [];
    }
    const changedAt = levelChange.changedAt.getTime();
    const newBadges = achievements.flatMap((achievement) => {
      if (achievement.earnedAt?.getTime() !== changedAt) return [];
      const definition = badgeDefinitions.find(
        (candidate) => candidate.id === achievement.id
      );
      return definition
        ? [{ id: definition.id, name: definition.name, rarity: definition.rarity }]
        : [];
    });

    return [{
      notificationId: notification.id,
      levelChangeId: levelChange.id,
      skillName: levelChange.skill.name,
      fromLevel: levelChange.fromLevel,
      toLevel: levelChange.toLevel,
      levelDescription:
        levelDescriptions.get(levelChange.toLevel) ??
        "新しいレベルの定義はまだ登録されていません。",
      managerName:
        levelChange.changedByMember?.name ??
        assessment?.reviewedByMember?.name ??
        null,
      managerComment:
        levelChange.skillSelfAssessment?.managerComment ??
        assessment?.managerComment ??
        null,
      targetRoleProgress: progress,
      newBadges
    }];
  });
}

function buildTargetProgress(
  data: Awaited<ReturnType<typeof fetchMemberGrowthData>>
) {
  const role = data.member?.targetRole;
  if (!role) return null;
  const evaluation = evaluateRoleAchievement(
    role.roleRequirements.map((requirement) => ({
      skillId: requirement.skillId,
      skillName: requirement.skill.name,
      requiredLevel: requirement.requiredLevel,
      isRequired: requirement.isRequired
    })),
    (data.member?.memberSkills ?? []).map((skill) => ({
      skillId: skill.skillId,
      skillName: skill.skill.name,
      level: skill.level
    }))
  );
  return {
    name: role.name,
    satisfiedCount: evaluation.satisfiedRequirements.length,
    requiredCount: role.roleRequirements.length,
    percentage:
      role.roleRequirements.length === 0
        ? 0
        : Math.round(evaluation.achievementRate * 100)
  };
}

export type LevelUpCelebration = Awaited<
  ReturnType<typeof getLevelUpCelebrations>
>[number];

async function assertLevelUpInteractionAccess(
  levelChangeId: string,
  viewer: { memberId: string; role: AuthRole },
  disallowOwner: boolean
) {
  const access = await growthRepository.getLevelUpInteractionAccess(
    levelChangeId,
    viewer.memberId,
    viewer.role
  );
  if (!access) {
    throw new AuthorizationError("このレベルアップを操作する権限がありません。", 403);
  }
  if (disallowOwner && access.ownerMemberId === viewer.memberId) {
    throw new UserFacingError("自分のレベルアップにはリアクションできません。");
  }
}

export type LevelUpFeedItem = Awaited<
  ReturnType<typeof growthRepository.listLevelUpFeed>
>[number];
