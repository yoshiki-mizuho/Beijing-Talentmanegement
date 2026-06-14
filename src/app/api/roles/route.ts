import { NextResponse, type NextRequest } from "next/server";

import {
  createRole,
  listRoles
} from "@/modules/roles/application/role-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

export async function GET() {
  const auth = await authorizeApi();

  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await listRoles());
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const role = await createRole(await request.json());
  return NextResponse.json(role, { status: 201 });
}
