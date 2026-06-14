import { NextResponse, type NextRequest } from "next/server";

import { setMemberSkillLevel } from "@/modules/members/application/member-service";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

type MemberSkillContext = {
  params: Promise<{ memberId: string }>;
};

export async function PUT(request: NextRequest, context: MemberSkillContext) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  const { memberId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await setMemberSkillLevel({ ...body, memberId }));
}
