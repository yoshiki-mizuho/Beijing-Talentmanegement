import { NextResponse, type NextRequest } from "next/server";

import {
  deactivateMember,
  updateMember
} from "@/modules/members/application/member-service";
import {
  adminOnly,
  authorizeApi
} from "@/server/auth/authorization";

type MemberContext = {
  params: Promise<{ memberId: string }>;
};

export async function PATCH(request: NextRequest, context: MemberContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { memberId } = await context.params;
  return NextResponse.json(
    await updateMember(memberId, await request.json(), auth.session.user.memberId)
  );
}

export async function DELETE(_request: NextRequest, context: MemberContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { memberId } = await context.params;
  await deactivateMember(memberId, auth.session.user.memberId);
  return new NextResponse(null, { status: 204 });
}
