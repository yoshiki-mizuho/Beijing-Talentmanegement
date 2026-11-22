import { AuthRole, Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { cache } from "react";

import { getTenantId, prisma } from "@/server/db/prisma";
import { getLeaderScope, getUser } from "@/server/platform/directory";

async function findOrCreateMember(platformUserId: string) {
  const found = await prisma.member.findUnique({
    where: { tenantId_platformUserId: {
      tenantId: await getTenantId(),
      platformUserId
    } }
  });
  if (found) return found;

  try {
    return await prisma.member.create({
      data: { platformUserId }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
    return prisma.member.findFirstOrThrow({ where: { platformUserId } });
  }
}

export type CurrentSession = {
  tenantId: string;
  tenantSlug: string | null;
  requestId: string | null;
  user: {
    id: string;
    platformUserId: string;
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

  let platformUser = null;
  try {
    platformUser = await getUser(platformUserId);
  } catch {
    // 基盤障害時は既存の Hub 固有データを利用できるようにする。
  }
  if (platformUser?.status === "INACTIVE") {
    return { status: "unregistered", session: null };
  }

  const member = await findOrCreateMember(platformUserId);

  const platformRole = requestHeaders.get("x-auth-user-role")?.trim().toUpperCase();
  let role: AuthRole = AuthRole.MEMBER;
  if (platformRole === "ADMIN") {
    role = AuthRole.ADMIN;
  } else {
    try {
      if ((await getLeaderScope(platformUserId)).nodeIds.length > 0) {
        role = AuthRole.MANAGER;
      }
    } catch {
      role = AuthRole.MEMBER;
    }
  }

  return {
    status: "authenticated",
    session: {
      tenantId,
      tenantSlug: requestHeaders.get("x-auth-tenant-slug")?.trim() || null,
      requestId: requestHeaders.get("x-auth-request-id")?.trim() || null,
      user: {
        id: member.id,
        platformUserId,
        memberId: member.id,
        name: platformUser?.name || "",
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
