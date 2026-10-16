import {
  evaluateRoleAchievement,
  type MemberSkillLevel,
  type SkillLevelRequirement
} from "@/modules/roles/domain/role-achievement";
import {
  roleInputSchema,
  roleRequirementInputSchema
} from "@/modules/roles/domain/role-schema";
import * as roleRepository from "@/modules/roles/infrastructure/role-repository";

export function listRoles() {
  return roleRepository.listRoles();
}

export function createRole(input: unknown, actorMemberId: string | null) {
  return roleRepository.createRole(roleInputSchema.parse(input), actorMemberId);
}

export function updateRole(id: string, input: unknown, actorMemberId: string | null) {
  return roleRepository.updateRole(id, roleInputSchema.parse(input), actorMemberId);
}

export function deactivateRole(id: string, actorMemberId: string | null) {
  return roleRepository.deactivateRole(id, actorMemberId);
}

export function deleteRole(id: string, actorMemberId: string | null) {
  return roleRepository.deleteRole(id, actorMemberId);
}

export function setRoleRequirement(input: unknown, actorMemberId: string | null) {
  return roleRepository.upsertRoleRequirement(
    roleRequirementInputSchema.parse(input),
    actorMemberId
  );
}

export function removeRoleRequirement(
  roleId: string,
  skillId: string,
  actorMemberId: string | null
) {
  return roleRepository.removeRoleRequirement(roleId, skillId, actorMemberId);
}

export function evaluateMemberForRole(
  requirements: SkillLevelRequirement[],
  memberSkills: MemberSkillLevel[]
) {
  return evaluateRoleAchievement(requirements, memberSkills);
}
