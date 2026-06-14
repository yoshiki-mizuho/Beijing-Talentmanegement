import { NextResponse, type NextRequest } from "next/server";

import {
  createMember,
  listMembers
} from "@/modules/members/application/member-service";
import { getCurrentSession } from "@/server/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listMembers());
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await createMember(await request.json());
  return NextResponse.json(member, { status: 201 });
}
