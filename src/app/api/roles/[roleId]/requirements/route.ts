import { NextResponse, type NextRequest } from "next/server";

import { setRoleRequirement } from "@/modules/roles/application/role-service";
import { getCurrentSession } from "@/server/auth/session";

type RoleRequirementContext = {
  params: Promise<{ roleId: string }>;
};

export async function PUT(request: NextRequest, context: RoleRequirementContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roleId } = await context.params;
  const body = await request.json();
  return NextResponse.json(await setRoleRequirement({ ...body, roleId }));
}
