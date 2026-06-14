"use server";

import { revalidatePath } from "next/cache";

import { markNotificationRead } from "@/modules/notifications/application/notification-service";
import { getCurrentSession } from "@/server/auth/session";
import { getString } from "@/shared/lib/form-data";

export async function markNotificationReadAction(formData: FormData) {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    throw new Error("A member-linked session is required.");
  }

  await markNotificationRead(getString(formData, "id"), session.user.memberId);
  revalidatePath("/notifications");
}
