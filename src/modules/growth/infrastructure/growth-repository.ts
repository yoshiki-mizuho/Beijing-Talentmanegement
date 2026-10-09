import { NotificationType } from "@prisma/client";

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
