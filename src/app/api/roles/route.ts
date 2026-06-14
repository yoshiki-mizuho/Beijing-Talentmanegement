import { NextResponse, type NextRequest } from "next/server";

import {
  createRole,
  listRoles
} from "@/modules/roles/application/role-service";
import { getCurrentSession } from "@/server/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listRoles());
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await createRole(await request.json());
  return NextResponse.json(role, { status: 201 });
}
