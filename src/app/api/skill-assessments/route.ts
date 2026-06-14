import { NextResponse, type NextRequest } from "next/server";

import {
  createSkillAssessment,
  listPendingSkillAssessments
} from "@/modules/members/application/member-service";
import { getCurrentSession } from "@/server/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listPendingSkillAssessments());
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const assessment = await createSkillAssessment({
    ...body,
    memberId: session.user.memberId
  });
  return NextResponse.json(assessment, { status: 201 });
}
