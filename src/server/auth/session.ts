import { AuthRole } from "@prisma/client";
import { headers } from "next/headers";
import { cache } from "react";

import { prisma } from "@/server/db/prisma";

export type CurrentSession = {
  tenantId: string;
  tenantSlug: string | null;
  requestId: string | null;
  user: {
    id: string;
    memberId: string;
    name: string;
    role: AuthRole;
    isActive: true;
  };
};

export type CurrentSessionResult =
  | { status: "authenticated"; session: CurrentSession }
  | { status: "unauthenticated" | "unregistered"; session: null };

export async function resolveCurrentSession(
  requestHeaders: Pick<Headers, "get">
): Promise<CurrentSessionResult> {
  const tenantId = requestHeaders.get("x-auth-tenant-id")?.trim();
  const platformUserId = requestHeaders.get("x-auth-user-id")?.trim();

  if (!tenantId || !platformUserId) {
    return { status: "unauthenticated", session: null };
  }

  const user = await prisma.user.findUnique({
    where: { platformUserId },
    select: {
      id: true,
      role: true,
      member: { select: { id: true, name: true, status: true } }
    }
  });

  if (!user?.member || user.member.status !== "ACTIVE") {
    return { status: "unregistered", session: null };
  }

  const platformRole = requestHeaders.get("x-auth-user-role")?.trim().toUpperCase();
  const role = platformRole === "ADMIN"
    ? AuthRole.ADMIN
    : user.role === AuthRole.MANAGER
      ? AuthRole.MANAGER
      : AuthRole.MEMBER;

  return {
    status: "authenticated",
    session: {
      tenantId,
      tenantSlug: requestHeaders.get("x-auth-tenant-slug")?.trim() || null,
      requestId: requestHeaders.get("x-auth-request-id")?.trim() || null,
      user: {
        id: user.id,
        memberId: user.member.id,
        name: user.member.name,
        role,
        isActive: true
      }
    }
  };
}

export const getCurrentSessionResult = cache(async () =>
  resolveCurrentSession(await headers())
);

export async function getCurrentSession() {
  return (await getCurrentSessionResult()).session;
}
