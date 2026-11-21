import { NextResponse, type NextRequest } from "next/server";

import { getMemberDetail } from "@/modules/members/application/member-service";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

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
