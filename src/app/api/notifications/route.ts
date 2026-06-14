import { NextResponse } from "next/server";

import { listNotifications } from "@/modules/notifications/application/notification-service";
import { getCurrentSession } from "@/server/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listNotifications(session.user.memberId));
}
