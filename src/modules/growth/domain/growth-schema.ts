import { z } from "zod";

export const MAX_LEVEL_UP_COMMENT_LENGTH = 200;
export const MAX_CHEER_MESSAGE_LENGTH = 500;
export const MAX_ONE_ON_ONE_NOTE_LENGTH = 500;

const requiredBody = (label: string, maxLength: number) =>
  z.string().trim().min(1, `${label}を入力してください。`).max(
    maxLength,
    `${label}は${maxLength}文字以内で入力してください。`
  );

export const levelUpReactionInputSchema = z.object({
  levelChangeId: z.string().min(1),
  memberId: z.string().min(1),
  type: z.enum(["CONGRATS", "AMAZING", "WANT_TO_LEARN"])
});

export const levelUpCommentInputSchema = z.object({
  levelChangeId: z.string().min(1),
  authorMemberId: z.string().min(1),
  body: requiredBody("コメント", MAX_LEVEL_UP_COMMENT_LENGTH)
});

export const cheerInputSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  message: requiredBody("応援メッセージ", MAX_CHEER_MESSAGE_LENGTH),
  targetSkillId: z.string().min(1).nullable().optional(),
  mentorMemberId: z.string().min(1).nullable().optional()
});

export const oneOnOneNoteInputSchema = z.object({
  managerMemberId: z.string().min(1),
  memberId: z.string().min(1),
  body: requiredBody("1on1メモ", MAX_ONE_ON_ONE_NOTE_LENGTH),
  discussedAt: z.date().nullable().optional()
});

export const oneOnOneNoteUpdateInputSchema = z.object({
  id: z.string().min(1),
  managerMemberId: z.string().min(1),
  body: requiredBody("1on1メモ", MAX_ONE_ON_ONE_NOTE_LENGTH)
});

export type LevelUpReactionInput = z.infer<typeof levelUpReactionInputSchema>;
export type LevelUpCommentInput = z.infer<typeof levelUpCommentInputSchema>;
export type CheerInput = z.infer<typeof cheerInputSchema>;
export type OneOnOneNoteInput = z.infer<typeof oneOnOneNoteInputSchema>;
export type OneOnOneNoteUpdateInput = z.infer<
  typeof oneOnOneNoteUpdateInputSchema
>;
