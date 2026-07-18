import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import {
  createMember,
  listMembers
} from "@/modules/members/application/member-service";
import { MemberUserLinkError } from "@/modules/members/domain/member-user-policy";
import { authorizeApi, managerOrAdmin } from "@/server/auth/authorization";

export async function GET(request: NextRequest) {
  const auth = await authorizeApi();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    return NextResponse.json(
      await listMembers(Object.fromEntries(request.nextUrl.searchParams))
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid member search query" }, { status: 400 });
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const member = await createMember(await request.json());
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof MemberUserLinkError) {
      return NextResponse.json(
        { error: "User email is already linked to another member" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Invalid member input" }, { status: 400 });
  }
}
