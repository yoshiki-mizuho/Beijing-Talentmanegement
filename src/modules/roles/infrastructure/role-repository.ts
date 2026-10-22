import type { RoleInput, RoleRequirementInput } from "@/modules/roles/domain/role-schema";
import { prisma } from "@/server/db/prisma";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import { diffForAudit } from "@/modules/audit/domain/audit-diff";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";

function roleAuditFields(role: {
  name: string;
  description: string | null;
  isActive: boolean;
}) {
  return {
    name: role.name,
    description: role.description,
    isActive: role.isActive
  };
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
  return prisma.$transaction(async (tx) => {
    const role = await tx.role.create({ data: input });
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
  requirements: { skillId: string; requiredLevel: number }[],
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const role = await tx.role.create({ data: input });
    if (requirements.length > 0) {
      await tx.roleRequirement.createMany({
        data: requirements.map((requirement) => ({
          roleId: role.id,
          skillId: requirement.skillId,
          requiredLevel: requirement.requiredLevel,
          isRequired: true
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
          isRequired: true
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
          isRequired: true
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
        isRequired: input.isRequired
      },
      create: input
    });
    const diff = diffForAudit(
      before
        ? { requiredLevel: before.requiredLevel, isRequired: before.isRequired }
        : {},
      {
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired
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

export async function removeRoleRequirement(
  roleId: string,
  skillId: string,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const requirement = await tx.roleRequirement.delete({
      where: {
        roleId_skillId: {
          roleId,
          skillId
        }
      }
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.ROLE_REQUIREMENT_REMOVE,
      targetType: AUDIT_TARGET_TYPE.ROLE,
      targetId: roleId,
      before: {
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired
      },
      metadata: { skillId }
    });
    return requirement;
  });
}
