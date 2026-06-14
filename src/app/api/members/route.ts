import { NextResponse, type NextRequest } from "next/server";

import {
  createMember,
  listMembers
} from "@/modules/members/application/member-service";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

export async function GET() {
  const auth = await authorizeApi();

  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await listMembers());
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  const member = await createMember(await request.json());
  return NextResponse.json(member, { status: 201 });
}
