import { NextResponse, type NextRequest } from "next/server";

import { changePassword } from "@/modules/auth/application/password-service";
import { authorizePasswordChangeApi } from "@/server/auth/authorization";

export async function POST(request: NextRequest) {
  const auth = await authorizePasswordChangeApi();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = await request.json();

    await changePassword({
      ...body,
      userId: auth.session.user.id
    });
  } catch {
    return NextResponse.json({ error: "Invalid password change input" }, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
