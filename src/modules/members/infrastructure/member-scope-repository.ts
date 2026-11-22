import { prisma } from "@/server/db/prisma";
import { getUser } from "@/server/platform/directory";
import type { PlatformUser } from "@/server/platform/types";

export function getScopeViewer(memberId: string) {
  return prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { id: true, platformUserId: true }
  });
}

export async function platformUserFallback(platformUserId: string): Promise<PlatformUser> {
  try {
    const user = await getUser(platformUserId);
    if (user) return user;
  } catch {
    // 基盤障害時は権限を広げず、本人だけの範囲を維持する。
  }
  return {
    id: platformUserId,
    name: "",
    email: "",
    status: "ACTIVE",
    organizationNodeId: null,
    nodeName: null,
    avatarUrl: null,
    avatarColor: null,
    isNodeLeader: false,
    role: "MEMBER"
  };
}

export async function ensureScopeMembers(platformMembers: Map<string, PlatformUser>) {
  const platformUserIds = [...platformMembers.keys()];
  if (platformUserIds.length === 0) return [];

  await prisma.member.createMany({
    data: platformUserIds.map((platformUserId) => ({ platformUserId })),
    skipDuplicates: true
  });

  return prisma.member.findMany({
    where: { platformUserId: { in: platformUserIds } },
    select: { id: true, platformUserId: true }
  });
}
