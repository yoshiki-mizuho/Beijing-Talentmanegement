import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { listMemberPage } from "@/modules/members/application/member-service";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";
import { getMemberScope } from "@/modules/members/application/member-scope";

export async function GET(request: NextRequest) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const scope = await getMemberScope(
      auth.session.user.role,
      auth.session.user.memberId
    );
    const members = await listMemberPage(
      Object.fromEntries(request.nextUrl.searchParams),
      scope.memberIds
    );
    return NextResponse.json(members);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid member search query" }, { status: 400 });
    }

    throw error;
  }
}
