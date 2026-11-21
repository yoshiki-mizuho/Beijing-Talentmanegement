import { getCurrentSession } from "@/server/auth/session";
import { getTenantId } from "@/server/db/prisma";

import { readCache, writeCache } from "./cache";
import { callUserService, isNotFound } from "./grpc";
import type {
  LeaderScope,
  Organization,
  OrganizationMember,
  OrganizationNode,
  PlatformUser,
  PlatformUserStatus
} from "./types";

type UserInfo = {
  id: string;
  name: string;
  email: string;
  status: string;
  organizationNodeId?: string;
  nodeName?: string;
  avatarUrl?: string;
  avatarColor?: string;
  isNodeLeader?: boolean;
  role?: string;
};

type NodeMember = {
  userId: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
};

type OrgSubtreeNode = {
  id: string;
  name: string;
  parentId: string;
  levelNumber: number;
  levelName: string;
  members: NodeMember[];
  leaderUserIds: string[];
};

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function userStatus(status: string): PlatformUserStatus {
  return status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

function mapUser(user: UserInfo): PlatformUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: userStatus(user.status),
    organizationNodeId: user.organizationNodeId || null,
    nodeName: user.nodeName || null,
    avatarUrl: user.avatarUrl || null,
    avatarColor: user.avatarColor || null,
    isNodeLeader: user.isNodeLeader ?? false,
    role: user.role === "ADMIN" ? "ADMIN" : "MEMBER"
  };
}

async function cached<T>(key: string, load: () => Promise<T>) {
  const tenantId = await getTenantId();
  const found = readCache<T>(tenantId, key);
  if (found !== undefined) return found;
  const value = await load();
  writeCache(tenantId, key, value);
  return value;
}

export async function getUsers(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, PlatformUser>();

  const tenantId = await getTenantId();
  const users = new Map<string, PlatformUser>();
  const missingIds: string[] = [];
  for (const userId of uniqueIds) {
    const found = readCache<PlatformUser | null>(tenantId, `user:${userId}`);
    if (found) users.set(userId, found);
    else if (found === undefined) missingIds.push(userId);
  }

  for (const batch of chunks(missingIds, 200)) {
    try {
      const response = await callUserService<{ users: UserInfo[] }>(
        "getUsers",
        { userIds: batch }
      );
      const foundIds = new Set<string>();
      for (const item of response.users) {
        const user = mapUser(item);
        foundIds.add(user.id);
        users.set(user.id, user);
        writeCache(tenantId, `user:${user.id}`, user);
      }
      for (const userId of batch) {
        if (!foundIds.has(userId)) writeCache(tenantId, `user:${userId}`, null);
      }
    } catch (error) {
      if (!isNotFound(error)) throw error;
      for (const userId of batch) writeCache(tenantId, `user:${userId}`, null);
    }
  }

  return users;
}

export async function getUser(userId: string) {
  return cached<PlatformUser | null>(`user:${userId}`, async () => {
    try {
      const response = await callUserService<{ user: UserInfo }>(
        "getUser",
        { userId }
      );
      return mapUser(response.user);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  });
}

async function findRootNodeId(nodeId: string) {
  const visited = new Set<string>();
  let currentId = nodeId;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error("Platform organization contains a parent cycle.");
    }
    visited.add(currentId);

    const response = await callUserService<{
      node: { id: string; parentId: string };
    }>("getOrgNode", { nodeId: currentId });
    if (!response.node.parentId) return response.node.id;
    currentId = response.node.parentId;
  }

  return null;
}

function mapOrganization(nodes: OrgSubtreeNode[]): Organization {
  const members = new Map<string, OrganizationMember>();
  const organizationNodes: OrganizationNode[] = nodes.map((node) => {
    for (const member of node.members) {
      members.set(member.userId, {
        id: member.userId,
        name: member.displayName,
        email: "",
        status: "ACTIVE",
        organizationNodeId: node.id,
        nodeName: node.name,
        avatarUrl: member.avatarUrl || null,
        avatarColor: member.avatarColor || null,
        isNodeLeader: node.leaderUserIds.includes(member.userId),
        role: "MEMBER"
      });
    }

    return {
      id: node.id,
      name: node.name,
      parentId: node.parentId || null,
      levelNumber: node.levelNumber,
      levelName: node.levelName,
      memberIds: node.members.map((member) => member.userId),
      leaderUserIds: node.leaderUserIds
    };
  });

  return { nodes: organizationNodes, members };
}

/**
 * 木から列挙できない未所属者は呼び出し本人だけを members に補う。
 * 本人も未所属なら nodes は空、members は本人だけになる。
 */
export async function getOrganization(currentUserId?: string) {
  const callerId = currentUserId ?? (await getCurrentSession())?.user.platformUserId;
  if (!callerId) {
    throw new Error("getOrganization requires the current platform user ID.");
  }

  return cached<Organization>(`organization:${callerId}`, async () => {
    const caller = await getUser(callerId);
    if (!caller) return { nodes: [], members: new Map() };

    if (!caller.organizationNodeId) {
      return { nodes: [], members: new Map([[caller.id, caller]]) };
    }

    const rootNodeId = await findRootNodeId(caller.organizationNodeId);
    if (!rootNodeId) return { nodes: [], members: new Map([[caller.id, caller]]) };

    const response = await callUserService<{ nodes: OrgSubtreeNode[] }>(
      "getOrgSubtree",
      { rootNodeId }
    );
    const organization = mapOrganization(response.nodes);
    const details = await getUsers([...organization.members.keys()]);
    for (const [userId, user] of details) {
      organization.members.set(userId, user);
    }
    if (!organization.members.has(caller.id)) {
      organization.members.set(caller.id, caller);
    }
    return organization;
  });
}

export async function getLeaderScope(userId: string) {
  return cached<LeaderScope>(`leader-scope:${userId}`, async () => {
    let response: { nodeIds: string[] };
    try {
      response = await callUserService("getLeaderScopeNodeIDs", { userId });
    } catch (error) {
      if (isNotFound(error)) return { nodeIds: [], members: new Map() };
      throw error;
    }
    if (response.nodeIds.length === 0) {
      return { nodeIds: [], members: new Map() };
    }

    const members = new Map<string, OrganizationMember>();
    for (const batch of chunks(response.nodeIds, 100)) {
      const memberResponse = await callUserService<{
        entries: Array<{ nodeId: string; members: NodeMember[] }>;
      }>("getNodeMembersBatch", { nodeIds: batch, recursive: true });

      for (const entry of memberResponse.entries) {
        for (const member of entry.members) {
          members.set(member.userId, {
            id: member.userId,
            name: member.displayName,
            email: "",
            status: "ACTIVE",
            organizationNodeId: null,
            nodeName: null,
            avatarUrl: member.avatarUrl || null,
            avatarColor: member.avatarColor || null,
            isNodeLeader: false,
            role: "MEMBER"
          });
        }
      }
    }

    const details = await getUsers([...members.keys()]);
    for (const [memberId, user] of details) members.set(memberId, user);

    return { nodeIds: response.nodeIds, members };
  });
}

export async function getSuperiorIds(userId: string) {
  return cached<string[]>(`superiors:${userId}`, async () => {
    try {
      const response = await callUserService<{ superiorIds: string[] }>(
        "getSuperiorIDs",
        { userId }
      );
      return response.superiorIds;
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
  });
}

export async function getDirectLeaderIds(userId: string) {
  return cached<string[]>(`direct-leaders:${userId}`, async () => {
    try {
      const response = await callUserService<{ userIds: string[] }>(
        "getDirectLeaderIDs",
        { userId }
      );
      return response.userIds;
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
  });
}

export { clearPlatformDirectoryCache } from "./cache";
export { PlatformTenantRequiredError, PlatformUnavailableError } from "./grpc";
export type {
  LeaderScope,
  Organization,
  OrganizationMember,
  OrganizationNode,
  PlatformUser,
  PlatformUserStatus
} from "./types";
