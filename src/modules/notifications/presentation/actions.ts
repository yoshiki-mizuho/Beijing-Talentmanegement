"use server";

import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  findNotification,
  markAllNotificationsRead,
  markNotificationRead
} from "@/modules/notifications/application/notification-service";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getString } from "@/shared/lib/form-data";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export async function confirmNotificationAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const id = getString(formData, "id");
    const notification = await findNotification(id, session.user.memberId);

    if (!notification) {
      throw new UserFacingError("通知が見つかりません。");
    }

    await markNotificationRead(id, session.user.memberId);
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
  }, "通知を確認しました。");
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();

    await markAllNotificationsRead(session.user.memberId);
    revalidatePath("/notifications");
    revalidatePath("/", "layout");
  }, "すべての通知を既読にしました。確認済みの通知は引き続き一覧で確認できます。");
}

export async function confirmLevelUpNotificationAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const id = getString(formData, "id");
    const notification = await findNotification(id, session.user.memberId);
    if (
      !notification ||
      notification.type !== NotificationType.SKILL_ASSESSMENT_APPROVED &&
      notification.type !== NotificationType.SKILL_ASSESSMENT_CORRECTED
    ) {
      throw new UserFacingError("レベルアップ通知が見つかりません。");
    }
    await markNotificationRead(id, session.user.memberId);
  }, "レベルアップ通知を確認しました。");
}
