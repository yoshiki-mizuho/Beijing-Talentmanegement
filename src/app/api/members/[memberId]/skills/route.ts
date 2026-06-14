import { NextResponse, type NextRequest } from "next/server";

import { setMemberSkillLevel } from "@/modules/members/application/member-service";
import { getCurrentSession } from "@/server/auth/session";

type MemberSkillContext = {
  params: Promise<{ memberId: string }>;
};

export async function PUT(request: NextRequest, context: MemberSkillContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await setMemberSkillLevel({ ...body, memberId }));
}
