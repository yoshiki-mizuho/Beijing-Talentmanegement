import { LevelUpReactionType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function getBadgeCalculationData(memberId: string) {
  const [member, assessments, levelChanges, prerequisites, sentCheers, sentReactions, mentoredCheers] =
    await Promise.all([
      prisma.member.findUnique({
        where: { id: memberId },
        select: {
          createdAt: true,
          memberSkills: { select: { skillId: true, level: true } },
          targetRole: {
            select: {
              roleRequirements: {
                where: { isRequired: true },
                select: {
                  skillId: true,
                  requiredLevel: true,
                  isRequired: true,
                  anyOfGroup: true
                }
              }
            }
          }
        }
      }),
      prisma.skillSelfAssessment.findMany({
        where: { memberId },
        select: { skillId: true, status: true, reviewedAt: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.skillLevelChange.findMany({
        where: { memberId },
        select: {
          id: true,
          skillId: true,
          fromLevel: true,
          toLevel: true,
          source: true,
          changedAt: true,
          skill: { select: { category: { select: { groupId: true } } } },
          reactions: {
            where: { type: LevelUpReactionType.WANT_TO_LEARN },
            select: { memberId: true, createdAt: true }
          }
        },
        orderBy: { changedAt: "asc" }
      }),
      prisma.skillPrerequisite.findMany({
        select: { skillId: true, prerequisiteSkillId: true }
      }),
      prisma.cheer.findMany({
        where: { fromMemberId: memberId },
        select: { toMemberId: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.levelUpReaction.findMany({
        where: { memberId },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.cheer.findMany({
        where: { mentorMemberId: memberId },
        select: { toMemberId: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      })
    ]);

  const firstMoverLevelChangeIds = await listFirstMoverLevelChangeIds({
    levelChangeIds: levelChanges.map((change) => change.id)
  });

  return {
    assessments,
    memberSkills: member?.memberSkills ?? [],
    levelChanges: levelChanges.map((change) => ({
      id: change.id,
      skillId: change.skillId,
      fromLevel: change.fromLevel,
      toLevel: change.toLevel,
      source: change.source,
      changedAt: change.changedAt,
      categoryGroupId: change.skill.category.groupId
    })),
    targetRequirements: member?.targetRole?.roleRequirements ?? [],
    mentoredCheers,
    memberCreatedAt: member?.createdAt,
    sentCheers,
    sentReactions,
    receivedTeachReactions: levelChanges.flatMap((change) =>
      change.reactions.map((reaction) => ({
        memberId: reaction.memberId,
        createdAt: reaction.createdAt
      }))
    ),
    firstMoverLevelChangeIds,
    prerequisites
  };
}

export async function listFirstMoverLevelChangeIds(input: {
  levelChangeIds?: ReadonlyArray<string>;
  skillIds?: ReadonlyArray<string>;
}) {
  const requestedChanges = input.levelChangeIds?.length
    ? await prisma.skillLevelChange.findMany({
        where: { id: { in: [...input.levelChangeIds] } },
        select: { id: true, skillId: true, changedAt: true }
      })
    : [];
  const skillIds = [...new Set([
    ...(input.skillIds ?? []),
    ...requestedChanges.map((change) => change.skillId)
  ])];
  if (skillIds.length === 0) return [];

  const earliest = await prisma.skillLevelChange.groupBy({
    by: ["skillId"],
    where: { skillId: { in: skillIds }, toLevel: { not: null } },
    _min: { changedAt: true }
  });
  const earliestBySkill = new Map(
    earliest.flatMap((item) => item._min.changedAt
      ? [[item.skillId, item._min.changedAt.getTime()] as const]
      : [])
  );
  const candidates = input.levelChangeIds?.length
    ? requestedChanges
    : await prisma.skillLevelChange.findMany({
        where: { skillId: { in: skillIds }, toLevel: { not: null } },
        select: { id: true, skillId: true, changedAt: true }
      });

  return candidates
    .filter((change) => earliestBySkill.get(change.skillId) === change.changedAt.getTime())
    .map((change) => change.id);
}

export type BadgeCalculationData = Awaited<ReturnType<typeof getBadgeCalculationData>>;
