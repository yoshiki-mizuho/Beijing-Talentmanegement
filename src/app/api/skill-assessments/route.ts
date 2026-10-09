import { NextResponse, type NextRequest } from "next/server";

import {
  createSkillAssessment,
  listPendingSkillAssessments
} from "@/modules/members/application/member-service";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

export async function GET() {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await listPendingSkillAssessments(
    auth.session.user.role,
    auth.session.user.memberId
  ));
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi();

  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json();
  const assessment = await createSkillAssessment({
    ...body,
    memberId: auth.session.user.memberId
  });
  return NextResponse.json(assessment, { status: 201 });
}
