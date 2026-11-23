import { MemberStatus, NotificationType, Prisma } from "@prisma/client";

import type {
  CheerInput,
  LevelUpCommentInput,
  LevelUpReactionInput,
  OneOnOneNoteInput,
  OneOnOneNoteUpdateInput
} from "@/modules/growth/domain/growth-schema";
import { uniqueReplyRecipientIds } from "@/modules/growth/domain/level-up-notification";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export function addLevelUpReaction(input: LevelUpReactionInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.levelUpReaction.findFirst({
      where: input
    });
    if (existing) return existing;

    const reaction = await tx.levelUpReaction.create({ data: input });
    const levelChange = await tx.skillLevelChange.findUniqueOrThrow({
      where: { id: input.levelChangeId },
      select: {
        id: true,
        memberId: true,
        toLevel: true,
        skill: { select: { name: true } }
      }
    });
    if (levelChange.toLevel === null) {
      throw new UserFacingError("この記録にはリアクションできません。");
    }
    if (levelChange.memberId === input.memberId) return reaction;

    const notification = await tx.notification.findFirst({
        where: {
          recipientMemberId: levelChange.memberId,
          type: NotificationType.LEVEL_UP_REACTED,
          skillLevelChangeId: levelChange.id
        },
        select: { id: true }
      });
    const data = {
      title: "レベルアップにリアクションが届きました",
      body: `${levelChange.skill.name} Lv${levelChange.toLevel} へのリアクションを確認しましょう。`,
      status: "UNREAD" as const,
      readAt: null,
      createdAt: new Date()
    };
    if (notification) {
      await tx.notification.update({ where: { id: notification.id }, data });
    } else {
      await tx.notification.create({
        data: {
          ...data,
          recipientMemberId: levelChange.memberId,
          actorMemberId: input.memberId,
          type: NotificationType.LEVEL_UP_REACTED,
          skillLevelChangeId: levelChange.id
        }
      });
    }
    return reaction;
  });
}

export function removeLevelUpReaction(input: LevelUpReactionInput) {
  return prisma.levelUpReaction.deleteMany({ where: input });
}

export async function getLevelUpInteractionAccess(
  levelChangeId: string
) {
  const levelChange = await prisma.skillLevelChange.findUnique({
    where: { id: levelChangeId },
    select: { memberId: true, toLevel: true }
  });
  return levelChange?.toLevel === null ? null : levelChange;
}

export function createLevelUpComment(input: LevelUpCommentInput) {
  return prisma.$transaction(async (tx) => {
    const levelChange = await tx.skillLevelChange.findUniqueOrThrow({
      where: { id: input.levelChangeId },
      include: {
        skill: { select: { name: true } },
        comments: {
          select: {
            authorMemberId: true,
            authorMember: { select: { status: true } }
          }
        }
      }
    });
    if (levelChange.toLevel === null) {
      throw new UserFacingError("この記録にはコメントできません。");
    }
    const comment = await tx.levelUpComment.create({ data: input });

    if (levelChange.memberId !== input.authorMemberId) {
      await tx.notification.create({
        data: {
          recipientMemberId: levelChange.memberId,
          actorMemberId: input.authorMemberId,
          type: NotificationType.LEVEL_UP_COMMENTED,
          skillLevelChangeId: levelChange.id,
          title: "レベルアップにコメントが届きました",
          body: `${levelChange.skill.name} Lv${levelChange.toLevel} へのコメントを確認しましょう。`
        }
      });
    } else {
      const recipientMemberIds = uniqueReplyRecipientIds(
        levelChange.memberId,
        levelChange.comments
      );
      if (recipientMemberIds.length > 0) {
        await tx.notification.createMany({
          data: recipientMemberIds.map((recipientMemberId) => ({
            recipientMemberId,
            actorMemberId: input.authorMemberId,
            type: NotificationType.LEVEL_UP_COMMENTED,
            skillLevelChangeId: levelChange.id,
            title: "返信が届きました",
            body: `${levelChange.skill.name} Lv${levelChange.toLevel} のコメントを確認しましょう。`
          }))
        });
      }
    }

    return comment;
  });
}

export function getLevelUpThread(levelChangeId: string) {
  return prisma.skillLevelChange.findUnique({
    where: { id: levelChangeId },
    select: {
      id: true,
      memberId: true,
      fromLevel: true,
      toLevel: true,
      changedAt: true,
      member: { select: { id: true } },
      skill: { select: { name: true, category: { select: { name: true } } } },
      reactions: {
        select: { type: true, memberId: true },
        orderBy: { createdAt: "asc" }
      },
      comments: {
        select: {
          id: true,
          authorMemberId: true,
          body: true,
          createdAt: true,
          authorMember: { select: { id: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

type FeedReactionRow = {
  type: "CONGRATS" | "AMAZING" | "WANT_TO_LEARN";
  count: number;
  reactedByViewer: boolean;
};

type FeedCommentRow = {
  id: string;
  authorMemberId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorAvatarColor: string | null;
  body: string;
  createdAt: string;
};

type LevelUpFeedRow = {
  id: string;
  memberId: string;
  memberName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  skillName: string;
  toLevel: number;
  changedAt: Date;
  reactions: FeedReactionRow[] | null;
  comments: FeedCommentRow[] | null;
};

export async function listLevelUpFeed(input: {
  memberIds: string[];
  viewerMemberId: string;
  start?: Date;
  end?: Date;
  limit: number;
}) {
  if (input.memberIds.length === 0) return [];
  const startCondition = input.start
    ? Prisma.sql`AND change."changedAt" >= ${input.start}`
    : Prisma.empty;
  const endCondition = input.end
    ? Prisma.sql`AND change."changedAt" < ${input.end}`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<LevelUpFeedRow[]>(Prisma.sql`
    SELECT
      change.id,
      change."memberId",
      '' AS "memberName",
      NULL::text AS "avatarUrl",
      NULL::text AS "avatarColor",
      skill.name AS "skillName",
      change."toLevel",
      change."changedAt",
      COALESCE(reaction_data.reactions, '[]'::jsonb) AS reactions,
      COALESCE(comment_data.comments, '[]'::jsonb) AS comments
    FROM "SkillLevelChange" change
    JOIN "Member" member ON member.id = change."memberId"
    JOIN "Skill" skill ON skill.id = change."skillId"
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', grouped.type,
          'count', grouped.count,
          'reactedByViewer', grouped."reactedByViewer"
        ) ORDER BY grouped.type
      ) AS reactions
      FROM (
        SELECT
          reaction.type,
          COUNT(*)::int AS count,
          BOOL_OR(reaction."memberId" = ${input.viewerMemberId}) AS "reactedByViewer"
        FROM "LevelUpReaction" reaction
        WHERE reaction."levelChangeId" = change.id
        GROUP BY reaction.type
      ) grouped
    ) reaction_data ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', comment.id,
          'authorMemberId', comment."authorMemberId",
          'authorName', '',
          'authorAvatarUrl', NULL,
          'authorAvatarColor', NULL,
          'body', comment.body,
          'createdAt', comment."createdAt"
        ) ORDER BY comment."createdAt"
      ) AS comments
      FROM "LevelUpComment" comment
      JOIN "Member" author ON author.id = comment."authorMemberId"
      WHERE comment."levelChangeId" = change.id
    ) comment_data ON TRUE
    WHERE change."memberId" IN (${Prisma.join(input.memberIds)})
      AND change.source NOT IN ('BACKFILL'::"SkillLevelChangeSource", 'CSV_IMPORT'::"SkillLevelChangeSource")
      AND (change."fromLevel" IS NULL OR change."toLevel" > change."fromLevel")
      ${startCondition}
      ${endCondition}
    ORDER BY change."changedAt" DESC, change.id DESC
    LIMIT ${input.limit}
  `);

  return rows.map((row) => ({
    ...row,
    reactions: row.reactions ?? [],
    comments: (row.comments ?? []).map((comment) => ({
      ...comment,
      createdAt: new Date(comment.createdAt)
    }))
  }));
}

export function createCheer(input: CheerInput) {
  return prisma.$transaction(async (tx) => {
    const cheer = await tx.cheer.create({ data: input });
    await tx.notification.create({
      data: {
        recipientMemberId: input.toMemberId,
        actorMemberId: input.fromMemberId,
        type: NotificationType.CHEER_RECEIVED,
        cheerId: cheer.id,
        title: "応援メッセージが届きました",
        body: input.message
      }
    });
    return cheer;
  });
}

export function getCheerAccessContext(toMemberId: string) {
  return prisma.member.findUnique({
    where: { id: toMemberId },
    select: { id: true }
  });
}

export function getMentorForCheer(mentorMemberId: string, targetSkillId?: string | null) {
  return prisma.member.findUnique({
    where: { id: mentorMemberId },
    select: {
      id: true,
      status: true,
      memberSkills: targetSkillId ? {
        where: { skillId: targetSkillId, level: { gte: 4 } },
        select: { id: true }
      } : false
    }
  });
}

export function listSkillMentorCandidates(skillIds: string[]) {
  return prisma.memberSkill.findMany({
    where: {
      skillId: { in: skillIds },
      level: { gte: 4 },
      member: { status: MemberStatus.ACTIVE }
    },
    select: {
      skillId: true,
      level: true,
      member: { select: { id: true, status: true } }
    }
  });
}

export function getOneOnOneMember(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true }
  });
}

export function createOneOnOneNote(input: OneOnOneNoteInput) {
  return prisma.oneOnOneNote.create({ data: input });
}

export async function updateOneOnOneNote(input: OneOnOneNoteUpdateInput) {
  const result = await prisma.oneOnOneNote.updateMany({
    where: { id: input.id, managerMemberId: input.managerMemberId },
    data: { body: input.body }
  });
  if (result.count === 0) {
    throw new UserFacingError("この1on1メモを更新する権限がありません。");
  }
  return prisma.oneOnOneNote.findFirstOrThrow({
    where: { id: input.id, managerMemberId: input.managerMemberId }
  });
}

export function listOneOnOneNotes(managerMemberId: string, memberId?: string) {
  return prisma.oneOnOneNote.findMany({
    where: {
      managerMemberId,
      ...(memberId ? { memberId } : {})
    },
    orderBy: { createdAt: "desc" }
  });
}

export function toggleOneOnOneNoteDiscussed(
  id: string,
  managerMemberId: string
) {
  return prisma.$transaction(async (tx) => {
    const note = await tx.oneOnOneNote.findFirst({
      where: { id, managerMemberId }
    });
    if (!note) {
      throw new UserFacingError("この1on1メモを更新する権限がありません。");
    }
    return tx.oneOnOneNote.update({
      where: { id: note.id },
      data: { discussedAt: note.discussedAt ? null : new Date() }
    });
  });
}
