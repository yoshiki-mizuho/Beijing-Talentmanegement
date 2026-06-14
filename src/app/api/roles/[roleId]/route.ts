import { NextResponse, type NextRequest } from "next/server";

import {
  deactivateRole,
  updateRole
} from "@/modules/roles/application/role-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

type RoleContext = {
  params: Promise<{ roleId: string }>;
};

export async function PATCH(request: NextRequest, context: RoleContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { roleId } = await context.params;
  return NextResponse.json(await updateRole(roleId, await request.json()));
}

export async function DELETE(_request: NextRequest, context: RoleContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { roleId } = await context.params;
  await deactivateRole(roleId);
  return new NextResponse(null, { status: 204 });
}
