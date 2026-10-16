import { NextResponse, type NextRequest } from "next/server";

import {
  deleteSkillCategory,
  updateSkillCategory
} from "@/modules/skills/application/skill-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

type SkillCategoryContext = {
  params: Promise<{ categoryId: string }>;
};

export async function PATCH(request: NextRequest, context: SkillCategoryContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { categoryId } = await context.params;
  return NextResponse.json(
    await updateSkillCategory(
      categoryId,
      await request.json(),
      auth.session.user.memberId
    )
  );
}

export async function DELETE(_request: NextRequest, context: SkillCategoryContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { categoryId } = await context.params;
  try {
    await deleteSkillCategory(categoryId, auth.session.user.memberId);
  } catch {
    return NextResponse.json(
      { error: "Skill category still has skills" },
      { status: 409 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
