import {
  createSkillInputSchema,
  skillCategoryInputSchema,
  skillInputSchema,
  skillLevelGuidesInputSchema
} from "@/modules/skills/domain/skill-schema";
import {
  type SkillSearchInput,
  skillSearchSchema
} from "@/modules/skills/domain/skill-search";
import * as skillRepository from "@/modules/skills/infrastructure/skill-repository";

export function listSkillCategories() {
  return skillRepository.listSkillCategories();
}

export function listSkillLevels() {
  return skillRepository.listSkillLevels();
}

export function listSkillLevelGuides(skillId: string) {
  return skillRepository.listSkillLevelGuides(skillId);
}

export function listActiveSkillsForSkillSheet() {
  return skillRepository.listActiveSkillsForSkillSheet();
}

export function createSkillCategory(input: unknown, actorMemberId: string | null) {
  return skillRepository.createSkillCategory(
    skillCategoryInputSchema.parse(input),
    actorMemberId
  );
}

export function updateSkillCategory(id: string, input: unknown, actorMemberId: string | null) {
  return skillRepository.updateSkillCategory(
    id,
    skillCategoryInputSchema.parse(input),
    actorMemberId
  );
}

export function deleteSkillCategory(id: string, actorMemberId: string | null) {
  return skillRepository.deleteSkillCategory(id, actorMemberId);
}

export function listSkills(input?: SkillSearchInput) {
  return skillRepository.listSkills(
    input ? skillSearchSchema.parse(input) : undefined
  );
}

export function createSkill(input: unknown, actorMemberId: string | null) {
  return skillRepository.createSkill(createSkillInputSchema.parse(input), actorMemberId);
}

export function updateSkill(id: string, input: unknown, actorMemberId: string | null) {
  return skillRepository.updateSkill(id, skillInputSchema.parse(input), actorMemberId);
}

export function updateSkillWithLevelGuides(
  id: string,
  input: unknown,
  levelGuides: unknown,
  actorMemberId: string | null
) {
  return skillRepository.updateSkillWithLevelGuides(
    id,
    skillInputSchema.parse(input),
    skillLevelGuidesInputSchema.parse(levelGuides),
    actorMemberId
  );
}

export function deactivateSkill(id: string, actorMemberId: string | null) {
  return skillRepository.deactivateSkill(id, actorMemberId);
}

export function deleteSkill(id: string, actorMemberId: string | null) {
  return skillRepository.deleteSkill(id, actorMemberId);
}
