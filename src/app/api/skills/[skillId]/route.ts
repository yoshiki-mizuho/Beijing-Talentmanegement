import { NextResponse, type NextRequest } from "next/server";

import {
  deactivateSkill,
  updateSkill
} from "@/modules/skills/application/skill-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

type SkillContext = {
  params: Promise<{ skillId: string }>;
};

export async function PATCH(request: NextRequest, context: SkillContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { skillId } = await context.params;
  return NextResponse.json(await updateSkill(skillId, await request.json()));
}

export async function DELETE(_request: NextRequest, context: SkillContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { skillId } = await context.params;
  await deactivateSkill(skillId);
  return new NextResponse(null, { status: 204 });
}
