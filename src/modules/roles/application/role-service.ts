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
  requiredLevel: z.number().int().min(1).max(5),
  anyOfGroup: z.number().int().min(1).nullable().optional()
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
    const groupCounts = new Map<number, number>();
    for (const requirement of requirements) {
      if (requirement.anyOfGroup != null) {
        groupCounts.set(requirement.anyOfGroup, (groupCounts.get(requirement.anyOfGroup) ?? 0) + 1);
      }
    }
    if ([...groupCounts.values()].some((count) => count < 2)) {
      context.addIssue({
        code: "custom",
        message: "いずれかの組には、スキルを2つ以上入れてください。"
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

export function updateRoleWithRequirements(
  id: string,
  input: unknown,
  requirements: unknown,
  actorMemberId: string | null
) {
  return roleRepository.updateRoleWithRequirements(
    id,
    roleInputSchema.parse(input),
    newRoleRequirementsSchema.parse(requirements),
    actorMemberId
  );
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

export function evaluateMemberForRole(
  requirements: SkillLevelRequirement[],
  memberSkills: MemberSkillLevel[]
) {
  return evaluateRoleAchievement(requirements, memberSkills);
}
