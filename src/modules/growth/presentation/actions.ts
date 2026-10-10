"use server";

import { revalidatePath } from "next/cache";

import {
  addLevelUpReaction,
  createCheer,
  createLevelUpComment,
  createOneOnOneNote,
  listOneOnOneNotes,
  toggleOneOnOneNoteDiscussed,
  updateOneOnOneNote,
  removeLevelUpReaction
} from "@/modules/growth/application/growth-service";
import { sortOneOnOneNotes } from "@/modules/growth/domain/cheer-and-one-on-one";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getOptionalString, getString } from "@/shared/lib/form-data";

export async function toggleLevelUpReactionAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const input = { levelChangeId: getString(formData, "levelChangeId"), memberId: session.user.memberId, type: getString(formData, "type") };
    const viewer = { memberId: session.user.memberId, role: session.user.role };
    if (getString(formData, "pressed") === "true") await removeLevelUpReaction(input, viewer);
    else await addLevelUpReaction(input, viewer);
    revalidatePath("/dashboard");
  }, "リアクションを更新しました。");
}

export async function createLevelUpCommentAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await createLevelUpComment({ levelChangeId: getString(formData, "levelChangeId"), authorMemberId: session.user.memberId, body: getString(formData, "body") }, { memberId: session.user.memberId, role: session.user.role });
    revalidatePath("/dashboard");
  }, "コメントを投稿しました。本人の通知にも届きます。");
}

export async function createCheerAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await createCheer({
      toMemberId: getString(formData, "toMemberId"),
      message: getString(formData, "message"),
      targetSkillId: getOptionalString(formData, "targetSkillId"),
      mentorMemberId: getOptionalString(formData, "mentorMemberId")
    }, { memberId: session.user.memberId, role: session.user.role });
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
  }, "応援を送りました");
}

export async function createOneOnOneNoteAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await createOneOnOneNote({
      memberId: getString(formData, "memberId"),
      body: getString(formData, "body")
    }, session.user.memberId);
    revalidatePath("/dashboard");
    revalidatePath("/members");
  }, "1on1 メモに追加しました");
}

export async function updateOneOnOneNoteAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await updateOneOnOneNote({
      id: getString(formData, "id"),
      body: getString(formData, "body")
    }, session.user.memberId);
    revalidatePath("/members");
  }, "1on1 メモを更新しました");
}

export async function toggleOneOnOneNoteDiscussedAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await toggleOneOnOneNoteDiscussed(getString(formData, "id"), session.user.memberId);
    revalidatePath("/members");
  }, "1on1 メモの状態を更新しました");
}

export async function listOneOnOneNotesAction(memberId: string) {
  const session = await requirePasswordReadyMember();
  const notes = await listOneOnOneNotes(session.user.memberId, memberId);
  return sortOneOnOneNotes(notes).map((note) => ({
    ...note,
    createdAt: note.createdAt.toISOString(),
    discussedAt: note.discussedAt?.toISOString() ?? null,
    updatedAt: note.updatedAt.toISOString()
  }));
}
