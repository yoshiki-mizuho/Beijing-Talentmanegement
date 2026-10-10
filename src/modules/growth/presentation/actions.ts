"use server";

import { revalidatePath } from "next/cache";

import {
  addLevelUpReaction,
  createLevelUpComment,
  removeLevelUpReaction
} from "@/modules/growth/application/growth-service";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getString } from "@/shared/lib/form-data";

export async function toggleLevelUpReactionAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const input = {
      levelChangeId: getString(formData, "levelChangeId"),
      memberId: session.user.memberId,
      type: getString(formData, "type")
    };
    const viewer = {
      memberId: session.user.memberId,
      role: session.user.role
    };
    if (getString(formData, "pressed") === "true") {
      await removeLevelUpReaction(input, viewer);
    } else {
      await addLevelUpReaction(input, viewer);
    }
    revalidatePath("/dashboard");
  }, "リアクションを更新しました。");
}

export async function createLevelUpCommentAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await createLevelUpComment({
      levelChangeId: getString(formData, "levelChangeId"),
      authorMemberId: session.user.memberId,
      body: getString(formData, "body")
    }, {
      memberId: session.user.memberId,
      role: session.user.role
    });
    revalidatePath("/dashboard");
  }, "コメントを投稿しました。本人の通知にも届きます。");
}
