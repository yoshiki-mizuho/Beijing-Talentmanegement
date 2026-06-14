import { NextResponse, type NextRequest } from "next/server";

import {
  deactivateRole,
  updateRole
} from "@/modules/roles/application/role-service";
import { getCurrentSession } from "@/server/auth/session";

type RoleContext = {
  params: Promise<{ roleId: string }>;
};

export async function PATCH(request: NextRequest, context: RoleContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roleId } = await context.params;
  return NextResponse.json(await updateRole(roleId, await request.json()));
}

export async function DELETE(_request: NextRequest, context: RoleContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roleId } = await context.params;
  await deactivateRole(roleId);
  return new NextResponse(null, { status: 204 });
}
