import type { AuthRole } from "@prisma/client";
import { cache } from "react";

import * as memberScopeRepository from "@/modules/members/infrastructure/member-scope-repository";
import { getLeaderScope, getOrganization } from "@/server/platform/directory";
import type { PlatformUser } from "@/server/platform/types";

export type MemberScope = {
  memberIds: string[];
  activeMemberCount: number;
  name: string;
  nodeId: string | null;
  nodes: Array<{ id: string; name: string; parentId: string | null }>;
};

async function platformScope(role: AuthRole, platformUserId: string) {
  if (role === "ADMIN") {
    const organization = await getOrganization(platformUserId);
    return { members: organization.members, nodes: organization.nodes, name: "全社" };
  }
  if (role === "MANAGER") {
    const [leaderScope, organization] = await Promise.all([
      getLeaderScope(platformUserId),
      getOrganization(platformUserId),
    ]);
    const members = new Map(leaderScope.members);
    if (!members.has(platformUserId)) {
      members.set(platformUserId, await memberScopeRepository.platformUserFallback(platformUserId));
    }
    return {
      members,
      nodes: organization.nodes.filter((node) => leaderScope.nodeIds.includes(node.id)),
      name: "担当範囲",
    };
  }
  return {
    members: new Map<string, PlatformUser>([
      [platformUserId, await memberScopeRepository.platformUserFallback(platformUserId)]
    ]),
    nodes: [],
    name: "本人"
  };
}

export const getMemberScope = cache(async function getMemberScope(
  role: AuthRole,
  memberId: string,
  requestedNodeId?: string
): Promise<MemberScope> {
  const viewer = await memberScopeRepository.getScopeViewer(memberId);
  if (!viewer.platformUserId) {
    return { memberIds: [viewer.id], activeMemberCount: 1, name: "本人", nodeId: null, nodes: [] };
  }

  const scope = await platformScope(role, viewer.platformUserId);
  const selectedNode = requestedNodeId
    ? scope.nodes.find((node) => node.id === requestedNodeId)
    : null;
  const descendantIds = selectedNode ? new Set([selectedNode.id]) : null;
  if (descendantIds) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of scope.nodes) {
        if (node.parentId && descendantIds.has(node.parentId) && !descendantIds.has(node.id)) {
          descendantIds.add(node.id);
          changed = true;
        }
      }
    }
  }
  const scopedPlatformMembers = descendantIds
    ? new Map([...scope.members].filter(([, member]) =>
        member.organizationNodeId !== null && descendantIds.has(member.organizationNodeId)
      ))
    : scope.members;
  const members = await memberScopeRepository.ensureScopeMembers(scopedPlatformMembers);
  return {
    memberIds: members.map((member) => member.id),
    activeMemberCount: [...scopedPlatformMembers.values()].filter((member) => member.status === "ACTIVE").length,
    name: selectedNode?.name ?? scope.name,
    nodeId: selectedNode?.id ?? null,
    nodes: scope.nodes.map((node) => ({ id: node.id, name: node.name, parentId: node.parentId })),
  };
});

export function memberIsInScope(scope: MemberScope, memberId: string) {
  return scope.memberIds.includes(memberId);
}
