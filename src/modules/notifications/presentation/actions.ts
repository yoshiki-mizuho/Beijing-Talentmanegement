"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  findNotification,
  markNotificationRead
} from "@/modules/notifications/application/notification-service";
import { getNotificationDestination } from "@/modules/notifications/presentation/notification-destination";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { getString } from "@/shared/lib/form-data";

export async function confirmNotificationAction(formData: FormData) {
  const session = await requirePasswordReadyMember();
  const id = getString(formData, "id");
  const notification = await findNotification(id, session.user.memberId);

  if (!notification) {
    redirect("/notifications");
  }

  const destination = getNotificationDestination({
    type: notification.type,
    role: session.user.role,
    skillSelfAssessmentId: notification.skillSelfAssessmentId
  });

  await markNotificationRead(id, session.user.memberId);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  redirect(destination ?? "/notifications");
}
