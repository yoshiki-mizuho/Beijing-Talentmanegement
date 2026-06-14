import {
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

export function listSkills() {
  return skillRepository.listSkills();
}

export function createSkill(input: unknown) {
  return skillRepository.createSkill(skillInputSchema.parse(input));
}

export function updateSkill(id: string, input: unknown) {
  return skillRepository.updateSkill(id, skillInputSchema.parse(input));
}

export function deactivateSkill(id: string) {
  return skillRepository.deactivateSkill(id);
}
