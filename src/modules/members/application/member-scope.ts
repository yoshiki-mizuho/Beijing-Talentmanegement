import type { AuthRole } from "@prisma/client";
import { cache } from "react";

import * as memberScopeRepository from "@/modules/members/infrastructure/member-scope-repository";
import { getLeaderScope, getOrganization } from "@/server/platform/directory";
import type { PlatformUser } from "@/server/platform/types";

export type MemberScope = {
  memberIds: string[];
  activeMemberCount: number;
  name: string;
  departmentId: string | null;
};

async function platformScope(role: AuthRole, platformUserId: string) {
  if (role === "ADMIN") {
    const organization = await getOrganization(platformUserId);
    return { members: organization.members, name: "全社" };
  }
  if (role === "MANAGER") {
    const leaderScope = await getLeaderScope(platformUserId);
    const members = new Map(leaderScope.members);
    if (!members.has(platformUserId)) {
      members.set(platformUserId, await memberScopeRepository.platformUserFallback(platformUserId));
    }
    return { members, name: "担当範囲" };
  }
  return {
    members: new Map<string, PlatformUser>([
      [platformUserId, await memberScopeRepository.platformUserFallback(platformUserId)]
    ]),
    name: "本人"
  };
}

export const getMemberScope = cache(async function getMemberScope(
  role: AuthRole,
  memberId: string,
  _requestedDepartmentId?: string
): Promise<MemberScope> {
  void _requestedDepartmentId;
  const viewer = await memberScopeRepository.getScopeViewer(memberId);
  if (!viewer.platformUserId) {
    return { memberIds: [viewer.id], activeMemberCount: 1, name: "本人", departmentId: null };
  }

  const scope = await platformScope(role, viewer.platformUserId);
  const members = await memberScopeRepository.ensureScopeMembers(scope.members);
  return {
    memberIds: members.map((member) => member.id),
    activeMemberCount: [...scope.members.values()].filter((member) => member.status === "ACTIVE").length,
    name: scope.name,
    departmentId: null
  };
});

export function memberIsInScope(scope: MemberScope, memberId: string) {
  return scope.memberIds.includes(memberId);
}
