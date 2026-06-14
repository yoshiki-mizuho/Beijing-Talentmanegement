import { NextResponse, type NextRequest } from "next/server";

import { markNotificationRead } from "@/modules/notifications/application/notification-service";
import { authorizeApi } from "@/server/auth/authorization";

type NotificationContext = {
  params: Promise<{ notificationId: string }>;
};

export async function POST(_request: NextRequest, context: NotificationContext) {
  const auth = await authorizeApi();

  if ("response" in auth) {
    return auth.response;
  }

  const { notificationId } = await context.params;
  await markNotificationRead(notificationId, auth.session.user.memberId);
  return new NextResponse(null, { status: 204 });
}
