import { NextResponse, type NextRequest } from "next/server";

import {
  createSkill,
  listSkills
} from "@/modules/skills/application/skill-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

export async function GET() {
  const auth = await authorizeApi();

  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await listSkills());
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const skill = await createSkill(await request.json());
  return NextResponse.json(skill, { status: 201 });
}
