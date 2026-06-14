import { NextResponse, type NextRequest } from "next/server";

import {
  createSkill,
  listSkills
} from "@/modules/skills/application/skill-service";
import { getCurrentSession } from "@/server/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listSkills());
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skill = await createSkill(await request.json());
  return NextResponse.json(skill, { status: 201 });
}
