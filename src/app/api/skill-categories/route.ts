import { NextResponse, type NextRequest } from "next/server";

import {
  createSkillCategory,
  listSkillCategories
} from "@/modules/skills/application/skill-service";
import { adminOnly, authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

export async function GET() {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await listSkillCategories());
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const category = await createSkillCategory(await request.json());
  return NextResponse.json(category, { status: 201 });
}
