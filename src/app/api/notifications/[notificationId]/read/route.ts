import { NextResponse, type NextRequest } from "next/server";

import { markNotificationRead } from "@/modules/notifications/application/notification-service";
import { getCurrentSession } from "@/server/auth/session";

type NotificationContext = {
  params: Promise<{ notificationId: string }>;
};

export async function POST(_request: NextRequest, context: NotificationContext) {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await context.params;
  await markNotificationRead(notificationId, session.user.memberId);
  return new NextResponse(null, { status: 204 });
}
