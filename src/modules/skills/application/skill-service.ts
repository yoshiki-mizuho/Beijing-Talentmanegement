import {
  createSkillInputSchema,
  skillCategoryInputSchema,
  skillInputSchema
} from "@/modules/skills/domain/skill-schema";
import * as skillRepository from "@/modules/skills/infrastructure/skill-repository";

export function listSkillCategories() {
  return skillRepository.listSkillCategories();
}

export function createSkillCategory(input: unknown) {
  return skillRepository.createSkillCategory(skillCategoryInputSchema.parse(input));
}

export function updateSkillCategory(id: string, input: unknown) {
  return skillRepository.updateSkillCategory(
    id,
    skillCategoryInputSchema.parse(input)
  );
}

export function deleteSkillCategory(id: string) {
  return skillRepository.deleteSkillCategory(id);
}

export function listSkills() {
  return skillRepository.listSkills();
}

export function createSkill(input: unknown) {
  return skillRepository.createSkill(createSkillInputSchema.parse(input));
}

export function updateSkill(id: string, input: unknown) {
  return skillRepository.updateSkill(id, skillInputSchema.parse(input));
}

export function deactivateSkill(id: string) {
  return skillRepository.deactivateSkill(id);
}
