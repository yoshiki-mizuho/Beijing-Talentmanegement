import { NextResponse, type NextRequest } from "next/server";

import { listSkillHolders } from "@/modules/skill-map/application/skill-map-service";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

type SkillContext = {
  params: Promise<{ skillId: string }>;
};

export async function GET(request: NextRequest, context: SkillContext) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  const { skillId } = await context.params;
  const departmentId = auth.session.user.role === "ADMIN"
    ? request.nextUrl.searchParams.get("department") ?? undefined
    : undefined;
  return NextResponse.json(
    await listSkillHolders(
      auth.session.user.role,
      auth.session.user.memberId,
      skillId,
      departmentId
    )
  );
}
