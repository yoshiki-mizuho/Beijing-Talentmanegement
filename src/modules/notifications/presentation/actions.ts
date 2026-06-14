"use server";

import { revalidatePath } from "next/cache";

import { markNotificationRead } from "@/modules/notifications/application/notification-service";
import { requireAuthenticatedMember } from "@/server/auth/authorization";
import { getString } from "@/shared/lib/form-data";

export async function markNotificationReadAction(formData: FormData) {
  const session = await requireAuthenticatedMember();

  await markNotificationRead(getString(formData, "id"), session.user.memberId);
  revalidatePath("/notifications");
}
