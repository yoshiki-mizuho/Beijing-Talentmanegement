import { AuthRole, MemberStatus, NotificationType, Prisma } from "@prisma/client";

import type {
  CheerInput,
  LevelUpCommentInput,
  LevelUpReactionInput,
  OneOnOneNoteInput,
  OneOnOneNoteUpdateInput
} from "@/modules/growth/domain/growth-schema";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export function addLevelUpReaction(input: LevelUpReactionInput) {
  return prisma.levelUpReaction.upsert({
    where: {
      levelChangeId_memberId_type: input
    },
    update: {},
    create: input
  });
}

export function removeLevelUpReaction(input: LevelUpReactionInput) {
  return prisma.levelUpReaction.deleteMany({ where: input });
}

export async function getLevelUpInteractionAccess(
  levelChangeId: string,
  viewerMemberId: string,
  viewerRole: AuthRole
) {
  const [levelChange, viewer] = await Promise.all([
    prisma.skillLevelChange.findUnique({
      where: { id: levelChangeId },
      select: {
        memberId: true,
        member: { select: { managerId: true, departmentId: true } }
      }
    }),
    prisma.member.findUnique({
      where: { id: viewerMemberId },
      select: { departmentId: true, status: true }
    })
  ]);
  if (!levelChange || !viewer || viewer.status !== MemberStatus.ACTIVE) return null;
  const canView =
    viewerRole === AuthRole.ADMIN ||
    levelChange.member.managerId === viewerMemberId ||
    levelChange.member.departmentId === viewer.departmentId;
  return canView ? { ownerMemberId: levelChange.memberId } : null;
}

export function createLevelUpComment(input: LevelUpCommentInput) {
  return prisma.$transaction(async (tx) => {
    const levelChange = await tx.skillLevelChange.findUniqueOrThrow({
      where: { id: input.levelChangeId },
      include: { skill: { select: { name: true } } }
    });
    const comment = await tx.levelUpComment.create({ data: input });

    if (levelChange.memberId !== input.authorMemberId) {
      await tx.notification.create({
        data: {
          recipientMemberId: levelChange.memberId,
          type: NotificationType.LEVEL_UP_COMMENTED,
          skillLevelChangeId: levelChange.id,
          title: "レベルアップにコメントが届きました",
          body: `${levelChange.skill.name} Lv.${levelChange.toLevel} へのコメントを確認しましょう。`
        }
      });
    }

    return comment;
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
  body: string;
  createdAt: string;
};

type LevelUpFeedRow = {
  id: string;
  memberId: string;
  memberName: string;
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
      member.name AS "memberName",
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
          'authorName', author.name,
          'body', comment.body,
          'createdAt', comment."createdAt"
        ) ORDER BY comment."createdAt"
      ) AS comments
      FROM "LevelUpComment" comment
      JOIN "Member" author ON author.id = comment."authorMemberId"
      WHERE comment."levelChangeId" = change.id
    ) comment_data ON TRUE
    WHERE change."memberId" IN (${Prisma.join(input.memberIds)})
      AND change.source <> 'BACKFILL'::"SkillLevelChangeSource"
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

export async function listDepartmentMemberIds(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { departmentId: true }
  });
  if (!member) return [];
  const members = await prisma.member.findMany({
    where: { departmentId: member.departmentId, status: MemberStatus.ACTIVE },
    select: { id: true }
  });
  return members.map((candidate) => candidate.id);
}

export function createCheer(input: CheerInput) {
  return prisma.$transaction(async (tx) => {
    const cheer = await tx.cheer.create({ data: input });
    await tx.notification.create({
      data: {
        recipientMemberId: input.toMemberId,
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
    select: {
      id: true,
      managerId: true
    }
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
      member: { select: { id: true, name: true, status: true } }
    }
  });
}

export function getOneOnOneMember(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, managerId: true }
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
