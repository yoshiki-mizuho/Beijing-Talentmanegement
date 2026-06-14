import { NextResponse, type NextRequest } from "next/server";

import { reviewSkillAssessment } from "@/modules/members/application/member-service";
import { getCurrentSession } from "@/server/auth/session";

type SkillAssessmentReviewContext = {
  params: Promise<{ assessmentId: string }>;
};

export async function POST(
  request: NextRequest,
  context: SkillAssessmentReviewContext
) {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assessmentId } = await context.params;
  const body = await request.json();

  return NextResponse.json(
    await reviewSkillAssessment({
      ...body,
      assessmentId,
      reviewerMemberId: session.user.memberId
    })
  );
}
