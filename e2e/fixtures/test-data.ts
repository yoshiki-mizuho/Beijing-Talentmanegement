import { randomBytes } from "node:crypto";

import type {
  AuthRole,
  LevelUpReactionType,
  Member,
  NotificationStatus,
  NotificationType,
  Role,
  Skill,
  SkillCategory,
  SkillLevelChangeSource,
  SkillSelfAssessmentStatus,
} from "@prisma/client";

import { deleteE2eData, type E2eDataIds } from "../cleanup/delete-e2e-data";
import { prisma, runWithTenant } from "../../src/server/db/prisma";
import type { DemoCredential } from "../helpers/credentials";

export function createE2ePrefix() {
  return `E2E-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

// E2E のデータは devkit のテナント local-dev に入れる（ブラウザに付ける X-Auth-Tenant-Id と同じ値）。
export const E2E_TENANT_ID = "11111111-1111-4111-8111-111111111111";

// spec の中で DB を直接読むときに使う。
export function withE2eTenant<T>(fn: () => T | PromiseLike<T>): Promise<T> {
  return runWithTenant(E2E_TENANT_ID, fn);
}

export function createE2eTestData() {
  const tenantId = E2E_TENANT_ID;
  const prefix = createE2ePrefix();
  const ids: E2eDataIds = {
    memberIds: [], skillIds: [], categoryIds: [], roleIds: [], nodeIds: [],
  };
  let sequence = 0;
  const platformUserIds: string[] = [];
  const platformNodeIds: string[] = [];
  const platformRootNodeId = crypto.randomUUID();
  let platformRootCreated = false;
  const platformNodesById = new Map<string, {
    id: string;
    name: string;
    parentId: string;
    leaderUserIds: string[];
  }>();
  const platformPost = (path: string, body: object) => fetch(`http://127.0.0.1:50052${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const unique = (label: string) => `${prefix}-${label}-${++sequence}`;
  const appendUnique = (target: string[], values: string[]) => {
    for (const value of values) {
      if (!target.includes(value)) target.push(value);
    }
  };

  const fixture = {
    prefix,
    track(input: Partial<E2eDataIds>) {
      appendUnique(ids.memberIds, input.memberIds ?? []);
      appendUnique(ids.skillIds, input.skillIds ?? []);
      appendUnique(ids.categoryIds, input.categoryIds ?? []);
      appendUnique(ids.roleIds, input.roleIds ?? []);
      appendUnique(ids.nodeIds, input.nodeIds ?? []);
    },
    platformNodeId(nodeId: string) {
      return platformNodesById.get(nodeId)?.id ?? null;
    },
    async trackCreated(input: {
      memberEmails?: string[];
      skillNames?: string[];
      categoryNames?: string[];
      roleNames?: string[];
    }) {
      const [members, skills, categories, roles] = await Promise.all([
        prisma.member.findMany({ where: { platformUserId: { in: platformUserIds } }, select: { id: true } }),
        prisma.skill.findMany({ where: { name: { in: input.skillNames ?? [] } }, select: { id: true } }),
        prisma.skillCategory.findMany({ where: { name: { in: input.categoryNames ?? [] } }, select: { id: true } }),
        prisma.role.findMany({ where: { name: { in: input.roleNames ?? [] } }, select: { id: true } }),
      ]);
      appendUnique(ids.memberIds, members.map((item) => item.id));
      appendUnique(ids.skillIds, skills.map((item) => item.id));
      appendUnique(ids.categoryIds, categories.map((item) => item.id));
      appendUnique(ids.roleIds, roles.map((item) => item.id));
    },
    async createDepartment(label: string, parentNodeId?: string) {
      const value = unique(label);
      const nodeId = crypto.randomUUID();
      if (!platformRootCreated) {
        await platformPost("/__fake/nodes", {
          tenantId,
          node: {
            id: platformRootNodeId,
            name: `${prefix}-root`,
            levelNumber: 0,
            levelName: "E2E root",
            parentId: null,
            leaderUserIds: []
          }
        });
        platformNodeIds.push(platformRootNodeId);
        platformRootCreated = true;
      }
      const node = {
        id: nodeId,
        name: value,
        parentId: parentNodeId
          ? platformNodesById.get(parentNodeId)?.id ?? platformRootNodeId
          : platformRootNodeId,
        leaderUserIds: [] as string[]
      };
      await platformPost("/__fake/nodes", {
        tenantId,
        node: { ...node, levelNumber: 1, levelName: "E2E" }
      });
      platformNodesById.set(node.id, node);
      platformNodeIds.push(node.id);
      return node;
    },
    async createMember(input: {
      label: string;
      nodeId: string;
      role?: AuthRole;
      leaderMemberId?: string;
      targetRoleId?: string;
      createdAt?: Date;
      lastRecapSeenMonth?: string | null;
      platformStatus?: "ACTIVE" | "INACTIVE";
      avatarUrl?: string | null;
      avatarColor?: string | null;
    }): Promise<{ member: Member; credential: DemoCredential; displayName: string; email: string }> {
      const value = unique(input.label);
      // ラベルは日本語のことがあるので、メールアドレスは接頭辞と連番だけで作る（形式チェックを通すため）
      const email = `e2e-${prefix.toLowerCase()}-${sequence}@example.com`;
      const platformUserId = crypto.randomUUID();
      const platformNode = platformNodesById.get(input.nodeId);
      if (!platformNode) throw new Error("基盤の組織ノードが登録されていません。");
      const manager = input.leaderMemberId
        ? await prisma.member.findUnique({
            where: { id: input.leaderMemberId },
            select: { platformUserId: true }
          })
        : null;
      const leaderUserIds = [...new Set([
        ...platformNode.leaderUserIds,
        ...(input.role === "MANAGER" ? [platformUserId] : []),
        ...(manager?.platformUserId ? [manager.platformUserId] : [])
      ])];
      platformNode.leaderUserIds = leaderUserIds;
      await platformPost("/__fake/nodes", {
        tenantId,
        node: { ...platformNode, levelNumber: 1, levelName: "E2E" }
      });
      await platformPost("/__fake/users", {
        tenantId,
        user: {
          id: platformUserId,
          name: value,
          email,
          role: input.role === "ADMIN" ? "ADMIN" : "MEMBER",
          status: input.platformStatus ?? "ACTIVE",
          organizationNodeId: platformNode.id,
          avatarColor: input.avatarColor ?? null,
          avatarUrl: input.avatarUrl ?? null
        }
      });
      platformUserIds.push(platformUserId);
      const member = await prisma.member.create({
        data: {
          targetRoleId: input.targetRoleId,
          createdAt: input.createdAt,
          lastRecapSeenMonth: input.lastRecapSeenMonth === undefined
            ? "2000-01"
            : input.lastRecapSeenMonth,
          platformUserId,
        },
      });
      ids.memberIds.push(member.id);
      return {
        member,
        displayName: value,
        email,
        credential: {
          platformUserId,
          platformRole: input.role === "ADMIN" ? "ADMIN" : "MEMBER"
        }
      };
    },
    async createSkill(label: string): Promise<{ category: SkillCategory; skill: Skill }> {
      const categoryValue = unique(`${label}-category`);
      const category = await prisma.skillCategory.create({ data: { name: categoryValue } });
      ids.categoryIds.push(category.id);
      const skillValue = unique(label);
      const skill = await prisma.skill.create({
        data: { code: skillValue, name: skillValue, categoryId: category.id },
      });
      ids.skillIds.push(skill.id);
      return { category, skill };
    },
    async createRole(label: string, requirements: Array<{ skillId: string; requiredLevel: number }>): Promise<Role> {
      const value = unique(label);
      const role = await prisma.role.create({
        data: {
          code: `ROLE-E2E-${crypto.randomUUID()}`,
          name: value,
          roleRequirements: { create: requirements.map((item) => ({ ...item, isRequired: true })) },
        },
      });
      ids.roleIds.push(role.id);
      return role;
    },
    async createMemberSkill(input: { memberId: string; skillId: string; level: number; approvedByMemberId?: string }) {
      return prisma.memberSkill.create({ data: input });
    },
    async createSelfAssessment(input: {
      memberId: string;
      skillId: string;
      requestedLevel: number;
      status?: SkillSelfAssessmentStatus;
      applicantComment?: string;
      managerComment?: string;
      reviewedByMemberId?: string;
      reviewedAt?: Date;
      createdAt?: Date;
    }) {
      return prisma.skillSelfAssessment.create({ data: input });
    },
    async createNotification(input: {
      recipientMemberId: string;
      type: NotificationType;
      status?: NotificationStatus;
      skillSelfAssessmentId?: string;
      skillLevelChangeId?: string;
      title: string;
      body?: string;
      createdAt?: Date;
    }) {
      return prisma.notification.create({ data: input });
    },
    async createLevelChange(input: {
      memberId: string;
      skillId: string;
      fromLevel: number | null;
      toLevel: number;
      changedByMemberId?: string;
      source?: SkillLevelChangeSource;
      skillSelfAssessmentId?: string;
      changedAt?: Date;
      createdAt?: Date;
    }) {
      return prisma.skillLevelChange.create({
        data: { ...input, source: input.source ?? "DIRECT_EDIT" },
      });
    },
    async createLevelUpReaction(input: {
      levelChangeId: string;
      memberId: string;
      type: LevelUpReactionType;
      createdAt?: Date;
    }) {
      return prisma.levelUpReaction.create({ data: input });
    },
    async cleanup() {
      await deleteE2eData(prisma, ids);
      for (const userId of platformUserIds) {
        await platformPost("/__fake/users/delete", { tenantId, userId });
      }
      for (const nodeId of [...platformNodeIds].reverse()) {
        await platformPost("/__fake/nodes/delete", { tenantId, nodeId });
      }
    },
  };

  return new Proxy(fixture, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function"
        ? (...args: unknown[]) => runWithTenant(tenantId, () => value(...args))
        : value;
    },
  });
}
