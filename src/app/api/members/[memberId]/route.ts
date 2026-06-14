import { NextResponse, type NextRequest } from "next/server";

import {
  deactivateMember,
  updateMember
} from "@/modules/members/application/member-service";
import { getCurrentSession } from "@/server/auth/session";

type MemberContext = {
  params: Promise<{ memberId: string }>;
};

export async function PATCH(request: NextRequest, context: MemberContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await context.params;
  return NextResponse.json(await updateMember(memberId, await request.json()));
}

export async function DELETE(_request: NextRequest, context: MemberContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await context.params;
  await deactivateMember(memberId);
  return new NextResponse(null, { status: 204 });
}
