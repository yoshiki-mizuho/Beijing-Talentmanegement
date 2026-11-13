import type { Prisma } from "@prisma/client";

import { selectNewRoleAchievements } from "@/modules/roles/domain/role-achievement-record";

export async function recordRoleAchievements(
  tx: Prisma.TransactionClient,
  scope: { memberIds?: string[]; roleIds?: string[] }
) {
  const [members, roles, existing] = await Promise.all([
    tx.member.findMany({
      where: scope.memberIds ? { id: { in: scope.memberIds } } : undefined,
      select: {
        id: true,
        targetRoleId: true,
        memberSkills: { select: { skillId: true, level: true } }
      }
    }),
    tx.role.findMany({
      where: {
        isActive: true,
        ...(scope.roleIds ? { id: { in: scope.roleIds } } : {})
      },
      select: {
        id: true,
        isActive: true,
        roleRequirements: {
          select: {
            skillId: true,
            requiredLevel: true,
            isRequired: true,
            anyOfGroup: true,
            skill: { select: { name: true } }
          }
        }
      }
    }),
    tx.roleAchievement.findMany({
      where: {
        ...(scope.memberIds ? { memberId: { in: scope.memberIds } } : {}),
        ...(scope.roleIds ? { roleId: { in: scope.roleIds } } : {})
      },
      select: { memberId: true, roleId: true }
    })
  ]);
  const candidates = members.flatMap((member) => roles.map((role) => ({
    memberId: member.id,
    targetRoleId: member.targetRoleId,
    memberSkills: member.memberSkills,
    role: {
      id: role.id,
      isActive: role.isActive,
      requirements: role.roleRequirements.map((requirement) => ({
        skillId: requirement.skillId,
        skillName: requirement.skill.name,
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired,
        anyOfGroup: requirement.anyOfGroup
      }))
    }
  })));
  const records = selectNewRoleAchievements(
    candidates,
    new Set(existing.map((record) => `${record.memberId}:${record.roleId}`)),
    new Date()
  );
  if (records.length === 0) return { count: 0 };
  return tx.roleAchievement.createMany({
    data: records,
    skipDuplicates: true
  });
}
