import {
  evaluateRoleAchievement,
  type MemberSkillLevel,
  type SkillLevelRequirement
} from "@/modules/roles/domain/role-achievement";
import {
  roleInputSchema,
  roleRequirementInputSchema
} from "@/modules/roles/domain/role-schema";
import { z } from "zod";
import * as roleRepository from "@/modules/roles/infrastructure/role-repository";

export function listRoles() {
  return roleRepository.listRoles();
}

export function createRole(input: unknown, actorMemberId: string | null) {
  return roleRepository.createRole(roleInputSchema.parse(input), actorMemberId);
}

const newRoleRequirementSchema = z.object({
  skillId: z.string().min(1),
  requiredLevel: z.number().int().min(1).max(5)
});
const newRoleRequirementsSchema = z.array(newRoleRequirementSchema).superRefine(
  (requirements, context) => {
    const skillIds = requirements.map((requirement) => requirement.skillId);
    if (new Set(skillIds).size !== skillIds.length) {
      context.addIssue({
        code: "custom",
        message: "同じスキルを複数の要件に指定できません。"
      });
    }
  }
);

export function createRoleWithRequirements(
  input: unknown,
  requirements: unknown,
  actorMemberId: string | null
) {
  return roleRepository.createRoleWithRequirements(
    roleInputSchema.parse(input),
    newRoleRequirementsSchema.parse(requirements),
    actorMemberId
  );
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
