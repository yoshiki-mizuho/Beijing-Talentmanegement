import type { RoleInput, RoleRequirementInput } from "@/modules/roles/domain/role-schema";
import { prisma } from "@/server/db/prisma";

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

export async function createRole(input: RoleInput) {
  return prisma.role.create({ data: input });
}

export async function updateRole(id: string, input: RoleInput) {
  return prisma.role.update({
    where: { id },
    data: input
  });
}

export async function deactivateRole(id: string) {
  return prisma.role.update({
    where: { id },
    data: { isActive: false }
  });
}

export async function upsertRoleRequirement(input: RoleRequirementInput) {
  return prisma.roleRequirement.upsert({
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
}

export async function removeRoleRequirement(roleId: string, skillId: string) {
  return prisma.roleRequirement.delete({
    where: {
      roleId_skillId: {
        roleId,
        skillId
      }
    }
  });
}
