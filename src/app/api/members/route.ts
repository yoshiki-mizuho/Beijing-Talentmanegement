import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import {
  createMember,
  listMembers
} from "@/modules/members/application/member-service";
import { MemberUserLinkError } from "@/modules/members/domain/member-user-policy";
import { adminOnly, authorizeApi, managerOrAdmin } from "@/server/auth/authorization";
import { getMemberScope } from "@/modules/members/application/member-scope";

export async function GET(request: NextRequest) {
  const auth = await authorizeApi(managerOrAdmin);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const scope = await getMemberScope(
      auth.session.user.role,
      auth.session.user.memberId
    );
    const members = await listMembers(
      Object.fromEntries(request.nextUrl.searchParams),
      scope.memberIds
    );
    return NextResponse.json(
      members.map((member) => ({
        ...member,
        pendingAssessments: member.selfAssessments,
        role: member.users[0]?.role ?? null
      }))
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid member search query" }, { status: 400 });
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { member } = await createMember(await request.json(), auth.session.user.memberId);
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
