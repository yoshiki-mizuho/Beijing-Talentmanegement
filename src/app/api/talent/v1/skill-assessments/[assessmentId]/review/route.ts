import { NextResponse, type NextRequest } from "next/server";

import { reviewSkillAssessment } from "@/modules/members/application/member-service";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";
import { UserFacingError } from "@/shared/lib/user-facing-error";

type SkillAssessmentReviewContext = {
  params: Promise<{ assessmentId: string }>;
};

export async function POST(
  request: NextRequest,
  context: SkillAssessmentReviewContext
) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  const { assessmentId } = await context.params;
  const body = await request.json();

  try {
    return NextResponse.json(
      await reviewSkillAssessment({
        ...body,
        assessmentId,
        reviewerMemberId: auth.session.user.memberId,
        reviewerRole: auth.session.user.role
      })
    );
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
