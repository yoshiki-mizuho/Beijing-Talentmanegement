import { cache } from "react";

import { displayMemberName } from "@/modules/members/domain/member-display";
import { prisma } from "@/server/db/prisma";
import { getOrganization, getUsers } from "@/server/platform/directory";

export type MemberProfile = {
  memberId: string;
  platformUserId: string | null;
  name: string;
  email: string;
  nodeId: string | null;
  nodeName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  // 基盤が応答し、その利用者が居なかった（基盤で消えた人など）。基盤が応答しないときは false。
  missingOnPlatform: boolean;
};

const resolveMemberProfilesCached = cache(async (memberIdsKey: string) => {
  const memberIds = memberIdsKey ? memberIdsKey.split("\u0000") : [];
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, platformUserId: true }
  });
  const platformIds = members.flatMap((member) =>
    member.platformUserId ? [member.platformUserId] : []
  );
  let users = new Map<
    string,
    Awaited<ReturnType<typeof getUsers>> extends Map<string, infer T> ? T : never
  >();
  let lookedUp = false;
  try {
    users = await getUsers(platformIds);
    lookedUp = true;
  } catch {
    // 基盤が停止していても、各画面は共通の未設定表示で継続する。
  }

  return new Map(
    members.map((member) => {
      const user = member.platformUserId
        ? users.get(member.platformUserId)
        : undefined;
      return [
        member.id,
        {
          memberId: member.id,
          platformUserId: member.platformUserId,
          name: displayMemberName(user?.name),
          email: user?.email ?? "",
          nodeId: user?.organizationNodeId ?? null,
          nodeName: user?.nodeName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
          avatarColor: user?.avatarColor ?? null,
          missingOnPlatform: lookedUp && !user
        } satisfies MemberProfile
      ];
    })
  );
});

export function resolveMemberProfiles(memberIds: string[]) {
  const uniqueIds = [...new Set(memberIds.filter(Boolean))].sort();
  return resolveMemberProfilesCached(uniqueIds.join("\u0000"));
}

export function fallbackMemberProfile(memberId: string): MemberProfile {
  return {
    memberId,
    platformUserId: null,
    name: displayMemberName(null),
    email: "",
    nodeId: null,
    nodeName: null,
    avatarUrl: null,
    avatarColor: null,
    missingOnPlatform: false
  };
}

export async function listSameNodeMemberIds(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { platformUserId: true },
  });
  if (!member?.platformUserId) return [memberId];
  try {
    const organization = await getOrganization(member.platformUserId);
    const viewer = organization.members.get(member.platformUserId);
    if (!viewer?.organizationNodeId) return [memberId];
    const platformUserIds = [...organization.members.values()]
      .filter((user) => user.organizationNodeId === viewer.organizationNodeId)
      .map((user) => user.id);
    const members = await prisma.member.findMany({
      where: { platformUserId: { in: platformUserIds } },
      select: { id: true },
    });
    return members.map((candidate) => candidate.id);
  } catch {
    return [memberId];
  }
}
