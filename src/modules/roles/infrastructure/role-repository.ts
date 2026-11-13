import type { RoleInput, RoleRequirementInput } from "@/modules/roles/domain/role-schema";
import { generateNextRoleCodeFromExistingCodes } from "@/modules/roles/domain/role-code";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import { diffForAudit } from "@/modules/audit/domain/audit-diff";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { UserFacingError } from "@/shared/lib/user-facing-error";

const ROLE_CODE_PREFIX = "ROLE-";

function roleAuditFields(role: {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}) {
  return {
    code: role.code,
    name: role.name,
    description: role.description,
    isActive: role.isActive
  };
}

async function generateNextRoleCode(client: Prisma.TransactionClient) {
  const roles = await client.role.findMany({
    where: { code: { startsWith: ROLE_CODE_PREFIX } },
    select: { code: true }
  });
  return generateNextRoleCodeFromExistingCodes(roles.map((role) => role.code));
}

function isRoleCodeConflict(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  if ((error as { code?: unknown }).code !== "P2002" || !("meta" in error)) return false;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");
  return targetText.toLowerCase().includes("code");
}

async function createRoleWithRetry<T>(
  operation: (tx: Prisma.TransactionClient, code: string) => Promise<T>
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) =>
        operation(tx, await generateNextRoleCode(tx))
      );
    } catch (error) {
      if (!isRoleCodeConflict(error)) throw error;
    }
  }
  throw new UserFacingError("ロールコードを採番できませんでした。もう一度お試しください。");
}

export async function listRoles() {
  return prisma.role.findMany({
    include: {
      roleRequirements: {
        include: {
          skill: {
            include: {
              category: true
            }
          }
        },
        orderBy: {
          skill: {
            name: "asc"
          }
        }
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function createRole(input: RoleInput, actorMemberId: string | null) {
  return createRoleWithRetry(async (tx, code) => {
    const role = await tx.role.create({ data: { ...input, code } });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.ROLE_CREATE,
      targetType: AUDIT_TARGET_TYPE.ROLE,
      targetId: role.id,
      after: roleAuditFields(role)
    });
    return role;
  });
}

export async function createRoleWithRequirements(
  input: RoleInput,
  requirements: { skillId: string; requiredLevel: number; anyOfGroup?: number | null }[],
  actorMemberId: string | null
) {
  return createRoleWithRetry(async (tx, code) => {
    const role = await tx.role.create({ data: { ...input, code } });
    if (requirements.length > 0) {
      await tx.roleRequirement.createMany({
        data: requirements.map((requirement) => ({
          roleId: role.id,
          skillId: requirement.skillId,
          requiredLevel: requirement.requiredLevel,
          isRequired: true,
          anyOfGroup: requirement.anyOfGroup ?? null
        }))
      });
    }
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.ROLE_CREATE,
      targetType: AUDIT_TARGET_TYPE.ROLE,
      targetId: role.id,
      after: roleAuditFields(role),
      metadata: {
        requirements: requirements.map((requirement) => ({
          skillId: requirement.skillId,
          requiredLevel: requirement.requiredLevel,
          isRequired: true,
          anyOfGroup: requirement.anyOfGroup ?? null
        }))
      }
    });
    for (const requirement of requirements) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.ROLE_REQUIREMENT_SET,
        targetType: AUDIT_TARGET_TYPE.ROLE,
        targetId: role.id,
        after: {
          requiredLevel: requirement.requiredLevel,
          isRequired: true,
          anyOfGroup: requirement.anyOfGroup ?? null
        },
        metadata: { skillId: requirement.skillId }
      });
    }
    return role;
  });
}

export async function updateRole(id: string, input: RoleInput, actorMemberId: string | null) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.role.findUniqueOrThrow({ where: { id } });
    const role = await tx.role.update({ where: { id }, data: input });
    const diff = diffForAudit(roleAuditFields(before), roleAuditFields(role));
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.ROLE_UPDATE,
        targetType: AUDIT_TARGET_TYPE.ROLE,
        targetId: id,
        ...diff
      });
    }
    return role;
  });
}

export async function updateRoleWithRequirements(
  id: string,
  input: RoleInput,
  requirements: { skillId: string; requiredLevel: number; anyOfGroup?: number | null }[],
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.role.findUniqueOrThrow({
      where: { id },
      include: { roleRequirements: true }
    });
    const role = await tx.role.update({ where: { id }, data: input });
    const roleDiff = diffForAudit(roleAuditFields(before), roleAuditFields(role));
    if (roleDiff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.ROLE_UPDATE,
        targetType: AUDIT_TARGET_TYPE.ROLE,
        targetId: id,
        ...roleDiff
      });
    }

    const nextBySkillId = new Map(
      requirements.map((requirement) => [requirement.skillId, requirement])
    );
    for (const current of before.roleRequirements) {
      const next = nextBySkillId.get(current.skillId);
      if (!next) {
        await tx.roleRequirement.delete({
          where: { roleId_skillId: { roleId: id, skillId: current.skillId } }
        });
        await recordAuditLog(tx, {
          actorMemberId,
          action: AUDIT_ACTION.ROLE_REQUIREMENT_REMOVE,
          targetType: AUDIT_TARGET_TYPE.ROLE,
          targetId: id,
          before: {
            requiredLevel: current.requiredLevel,
            isRequired: current.isRequired,
            anyOfGroup: current.anyOfGroup ?? null
          },
          metadata: { skillId: current.skillId }
        });
        continue;
      }
      nextBySkillId.delete(current.skillId);
      // 画面では必須・任意を変えないので、既存の要件の isRequired はそのまま残す
      const requirementDiff = diffForAudit(
        { requiredLevel: current.requiredLevel, isRequired: current.isRequired, anyOfGroup: current.anyOfGroup ?? null },
        { requiredLevel: next.requiredLevel, isRequired: current.isRequired, anyOfGroup: next.anyOfGroup ?? null }
      );
      if (requirementDiff) {
        await tx.roleRequirement.update({
          where: { roleId_skillId: { roleId: id, skillId: current.skillId } },
          data: { requiredLevel: next.requiredLevel, anyOfGroup: next.anyOfGroup ?? null }
        });
        await recordAuditLog(tx, {
          actorMemberId,
          action: AUDIT_ACTION.ROLE_REQUIREMENT_SET,
          targetType: AUDIT_TARGET_TYPE.ROLE,
          targetId: id,
          ...requirementDiff,
          metadata: { skillId: current.skillId }
        });
      }
    }
    for (const requirement of nextBySkillId.values()) {
      await tx.roleRequirement.create({
        data: { roleId: id, ...requirement, anyOfGroup: requirement.anyOfGroup ?? null, isRequired: true }
      });
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.ROLE_REQUIREMENT_SET,
        targetType: AUDIT_TARGET_TYPE.ROLE,
        targetId: id,
        after: { requiredLevel: requirement.requiredLevel, isRequired: true, anyOfGroup: requirement.anyOfGroup ?? null },
        metadata: { skillId: requirement.skillId }
      });
    }
    return role;
  });
}

export async function deactivateRole(id: string, actorMemberId: string | null) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.role.findUniqueOrThrow({ where: { id } });
    const role = await tx.role.update({ where: { id }, data: { isActive: false } });
    const diff = diffForAudit({ isActive: before.isActive }, { isActive: role.isActive });
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.ROLE_DEACTIVATE,
        targetType: AUDIT_TARGET_TYPE.ROLE,
        targetId: id,
        ...diff
      });
    }
    return role;
  });
}

export async function deleteRole(id: string, actorMemberId: string | null) {
  return prisma.$transaction(async (transaction) => {
    const before = await transaction.role.findUniqueOrThrow({ where: { id } });
    await transaction.roleRequirement.deleteMany({ where: { roleId: id } });
    const cleared = await transaction.member.updateMany({
      where: { targetRoleId: id },
      data: { targetRoleId: null }
    });
    const role = await transaction.role.delete({ where: { id } });
    await recordAuditLog(transaction, {
      actorMemberId,
      action: AUDIT_ACTION.ROLE_DELETE,
      targetType: AUDIT_TARGET_TYPE.ROLE,
      targetId: id,
      before: roleAuditFields(before),
      metadata: { clearedTargetMembers: cleared.count }
    });
    return role;
  });
}

export async function upsertRoleRequirement(
  input: RoleRequirementInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.roleRequirement.findUnique({
      where: {
        roleId_skillId: { roleId: input.roleId, skillId: input.skillId }
      }
    });
    const requirement = await tx.roleRequirement.upsert({
      where: {
        roleId_skillId: {
          roleId: input.roleId,
          skillId: input.skillId
        }
      },
      update: {
        requiredLevel: input.requiredLevel,
        isRequired: input.isRequired,
        anyOfGroup: input.anyOfGroup ?? null
      },
      create: input
    });
    const diff = diffForAudit(
      before
        ? { requiredLevel: before.requiredLevel, isRequired: before.isRequired, anyOfGroup: before.anyOfGroup ?? null }
        : {},
      {
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired,
        anyOfGroup: requirement.anyOfGroup ?? null
      }
    );
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.ROLE_REQUIREMENT_SET,
        targetType: AUDIT_TARGET_TYPE.ROLE,
        targetId: input.roleId,
        before: before ? diff.before : null,
        after: diff.after,
        metadata: { skillId: input.skillId }
      });
    }
    return requirement;
  });
}
