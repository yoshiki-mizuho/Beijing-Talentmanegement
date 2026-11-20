import { NextResponse, type NextRequest } from "next/server";

import {
  deactivateMember,
  getMemberDetail,
  updateMember
} from "@/modules/members/application/member-service";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";
import {
  adminOnly,
  authorizeApi,
  managerOrAdmin
} from "@/server/auth/authorization";

type MemberContext = {
  params: Promise<{ memberId: string }>;
};

export async function GET(_request: NextRequest, context: MemberContext) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  const { memberId } = await context.params;
  // 範囲外のメンバーは、存在するかどうかに関係なく 403 にする（存在を知らせない）
  const scope = await getMemberScope(auth.session.user.role, auth.session.user.memberId);
  if (!memberIsInScope(scope, memberId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const member = await getMemberDetail(memberId);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(member);
}

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
