import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import {
  createSkill,
  listSkills
} from "@/modules/skills/application/skill-service";
import { adminOnly, authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

export async function GET(request: NextRequest) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    return NextResponse.json(
      await listSkills(Object.fromEntries(request.nextUrl.searchParams))
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid skill search query" }, { status: 400 });
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const skill = await createSkill(await request.json());
  return NextResponse.json(skill, { status: 201 });
}
