import {
  cheerInputSchema,
  levelUpCommentInputSchema,
  levelUpReactionInputSchema,
  oneOnOneNoteInputSchema,
  oneOnOneNoteUpdateInputSchema
} from "@/modules/growth/domain/growth-schema";
import {
  calculateBadgeAchievements
} from "@/modules/growth/domain/growth-insights";
import { badgeDefinitions } from "@/modules/growth/domain/badge-art";
import * as growthRepository from "@/modules/growth/infrastructure/growth-repository";
import {
  getMemberGrowthData as fetchMemberGrowthData,
  listUnreadLevelUpNotifications
} from "@/modules/growth/infrastructure/member-growth-repository";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

export function addLevelUpReaction(input: unknown) {
  return growthRepository.addLevelUpReaction(
    levelUpReactionInputSchema.parse(input)
  );
}

export function removeLevelUpReaction(input: unknown) {
  return growthRepository.removeLevelUpReaction(
    levelUpReactionInputSchema.parse(input)
  );
}

export function createLevelUpComment(input: unknown) {
  return growthRepository.createLevelUpComment(
    levelUpCommentInputSchema.parse(input)
  );
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
