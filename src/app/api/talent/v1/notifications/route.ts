import { NextResponse } from "next/server";

import { listNotifications } from "@/modules/notifications/application/notification-service";
import { authorizeApi } from "@/server/auth/authorization";

export async function GET() {
  const auth = await authorizeApi();

  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await listNotifications(auth.session.user.memberId));
}
