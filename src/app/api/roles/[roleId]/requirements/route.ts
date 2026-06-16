import { NextResponse, type NextRequest } from "next/server";

import { setRoleRequirement } from "@/modules/roles/application/role-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

type RoleRequirementContext = {
  params: Promise<{ roleId: string }>;
};

export async function PUT(request: NextRequest, context: RoleRequirementContext) {
  const auth = await authorizeApi(adminOnly);

  if ("response" in auth) {
    return auth.response;
  }

  const { roleId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await setRoleRequirement({ ...body, roleId }));
}
