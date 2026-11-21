import { NextResponse, type NextRequest } from "next/server";

import { setMemberSkillLevel } from "@/modules/members/application/member-service";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";

type MemberSkillContext = {
  params: Promise<{ memberId: string }>;
};

export async function PUT(request: NextRequest, context: MemberSkillContext) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  const { memberId } = await context.params;
  const scope = await getMemberScope(auth.session.user.role, auth.session.user.memberId);
  if (!memberIsInScope(scope, memberId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  return NextResponse.json(await setMemberSkillLevel({
    ...body,
    memberId,
    changedByMemberId: auth.session.user.memberId
  }, auth.session.user.memberId));
}
