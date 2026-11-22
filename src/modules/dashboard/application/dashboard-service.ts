import type { AuthRole } from "@prisma/client";

import {
  buildDepartmentMetrics,
  groupLevelChangesByMember,
  organizationDashboardChangesSince,
  selectDepartmentId,
} from "@/modules/dashboard/domain/organization-dashboard";
import { buildOrganizationDashboard } from "@/modules/dashboard/domain/dashboard-summary";
import { getOrganizationDashboardSource } from "@/modules/dashboard/infrastructure/dashboard-repository";
import {
  ensureScopeMembers,
  getScopeViewer,
} from "@/modules/members/infrastructure/member-scope-repository";
import { listRoleAchievements } from "@/modules/roles/application/role-achievement-service";
import { getLeaderScope, getOrganization } from "@/server/platform/directory";
import type { OrganizationNode, PlatformUser } from "@/server/platform/types";

function descendantIds(nodes: OrganizationNode[], nodeId: string) {
  const result = new Set([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id);
        changed = true;
      }
    }
  }
  return [...result];
}

function nodeTree(nodes: OrganizationNode[]) {
  const ancestors = (node: OrganizationNode) => {
    const result: OrganizationNode[] = [];
    let current = node;
    const visited = new Set<string>();
    while (current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = nodes.find((candidate) => candidate.id === current.parentId);
      if (!parent) break;
      result.unshift(parent);
      current = parent;
    }
    return result;
  };
  return nodes.map((node) => {
    const parents = ancestors(node);
    return {
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      depth: parents.length,
      pathLabel: [...parents.map((parent) => parent.name), node.name].join(" / "),
    };
  });
}

export async function getDashboardSummary(
  role: AuthRole,
  memberId: string,
  nodeId?: string,
) {
  const now = new Date();
  const viewer = await getScopeViewer(memberId);
  if (!viewer.platformUserId) {
    throw new Error("組織ダッシュボードの利用者が基盤に結び付いていません。");
  }
  const organization = await getOrganization(viewer.platformUserId);
  const platformScope = role === "ADMIN"
    ? { members: organization.members, nodeIds: organization.nodes.map((node) => node.id) }
    : await getLeaderScope(viewer.platformUserId);
  const visibleIds = platformScope.nodeIds;
  const visibleNodes = organization.nodes.filter((node) => visibleIds.includes(node.id));
  const memberRows = await ensureScopeMembers(platformScope.members as Map<string, PlatformUser>);
  const source = await getOrganizationDashboardSource({
    memberIds: memberRows.map((member) => member.id),
    changesSince: organizationDashboardChangesSince(now),
  });
  const platformByMember = new Map(memberRows.map((member) => [member.id, member.platformUserId]));
  const sourceMembers = source.members.map((member) => ({
    ...member,
    nodeId: platformByMember.get(member.id)
      ? platformScope.members.get(platformByMember.get(member.id)!)?.organizationNodeId ?? null
      : null,
  }));
  const roleAchievements = await listRoleAchievements({
    memberIds: sourceMembers.map((member) => member.id),
  });
  const achievementsByMember = new Map<string, typeof roleAchievements>();
  for (const achievement of roleAchievements) {
    const achievements = achievementsByMember.get(achievement.memberId) ?? [];
    achievements.push(achievement);
    achievementsByMember.set(achievement.memberId, achievements);
  }
  const enrichedMembers = sourceMembers.map((member) => ({
    ...member,
    roleAchievements: achievementsByMember.get(member.id) ?? [],
  }));
  const tree = nodeTree(visibleNodes);
  const roots = tree.filter((item) => !item.parentId || !visibleIds.includes(item.parentId));
  const viewerNodeId = organization.members.get(viewer.platformUserId)?.organizationNodeId ?? null;
  const fallback = role === "ADMIN"
    ? roots.length === 1 ? roots[0].id : null
    : visibleIds.includes(viewerNodeId ?? "") ? viewerNodeId : roots[0]?.id ?? null;
  const selectedId = selectDepartmentId(nodeId, visibleIds, fallback);
  const selectedNodeIds = selectedId ? descendantIds(visibleNodes, selectedId) : visibleIds;
  const memberIds = new Set(enrichedMembers
    .filter((member) => member.nodeId && selectedNodeIds.includes(member.nodeId))
    .map((member) => member.id));
  const members = enrichedMembers.filter((member) => memberIds.has(member.id));
  const changes = source.changes.filter((change) => memberIds.has(change.memberId));
  const changesByMember = groupLevelChangesByMember(source.changes);
  const childIds = visibleNodes.filter((node) => node.parentId === selectedId).map((node) => node.id);
  const comparisonIds = childIds.length ? childIds : roots.map((node) => node.id);
  const comparisons = comparisonIds.map((id) => {
    const ids = descendantIds(visibleNodes, id);
    const comparisonMembers = enrichedMembers.filter((member) => member.nodeId && ids.includes(member.nodeId));
    return {
      id,
      name: visibleNodes.find((node) => node.id === id)?.name ?? "",
      ...buildDepartmentMetrics({
        members: comparisonMembers,
        changes: comparisonMembers.flatMap((member) => changesByMember.get(member.id) ?? []),
        changesByMember,
        now,
      }),
    };
  });
  const summary = buildOrganizationDashboard({
    members: members.map((member) => ({
      ...member,
      organizationNode: member.nodeId ? {
        id: member.nodeId,
        name: visibleNodes.find((node) => node.id === member.nodeId)?.name ?? "",
      } : null,
    })),
    levelChanges: changes,
    pendingAssessments: [],
    now,
  });
  const counts = new Map(tree.map((item) => {
    const ids = descendantIds(visibleNodes, item.id);
    return [item.id, enrichedMembers.filter((member) => member.nodeId && ids.includes(member.nodeId)).length];
  }));
  const selectedNode = tree.find((item) => item.id === selectedId);
  return {
    scope: {
      name: selectedNode?.name ?? "全社",
      nodeId: selectedId,
      pathLabel: selectedNode?.pathLabel ?? "全社",
      memberCount: members.length,
    },
    showCompany: role === "ADMIN" && roots.length > 1,
    tree: tree.map((item) => ({
      ...item,
      visible: true,
      memberCount: counts.get(item.id) ?? 0,
      own: item.id === viewerNodeId,
    })),
    metrics: buildDepartmentMetrics({ members, changes, changesByMember, now }),
    comparisons,
    comparisonMode: childIds.length ? ("children" as const) : ("siblings" as const),
    summary,
  };
}
