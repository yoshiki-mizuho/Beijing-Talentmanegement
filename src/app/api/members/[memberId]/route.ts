import { NextResponse, type NextRequest } from "next/server";

import {
  deactivateMember,
  updateMember
} from "@/modules/members/application/member-service";
import {
  adminOnly,
  authorizeApi,
  managerOrAdmin
} from "@/server/auth/authorization";

type MemberContext = {
  params: Promise<{ memberId: string }>;
};

export async function PATCH(request: NextRequest, context: MemberContext) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  const { memberId } = await context.params;
  return NextResponse.json(await updateMember(memberId, await request.json()));
}

export async function DELETE(_request: NextRequest, context: MemberContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { memberId } = await context.params;
  await deactivateMember(memberId);
  return new NextResponse(null, { status: 204 });
}
