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

export function createRole(input: unknown) {
  return roleRepository.createRole(roleInputSchema.parse(input));
}

export function updateRole(id: string, input: unknown) {
  return roleRepository.updateRole(id, roleInputSchema.parse(input));
}

export function deactivateRole(id: string) {
  return roleRepository.deactivateRole(id);
}

export function setRoleRequirement(input: unknown) {
  return roleRepository.upsertRoleRequirement(roleRequirementInputSchema.parse(input));
}

export function removeRoleRequirement(roleId: string, skillId: string) {
  return roleRepository.removeRoleRequirement(roleId, skillId);
}

export function evaluateMemberForRole(
  requirements: SkillLevelRequirement[],
  memberSkills: MemberSkillLevel[]
) {
  return evaluateRoleAchievement(requirements, memberSkills);
}
