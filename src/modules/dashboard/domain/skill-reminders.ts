import { isNewSkill } from "@/modules/members/presentation/skill-sheet";

export function buildSkillReminderCards(
  input: {
    skills: ReadonlyArray<{ id: string; name: string; createdAt: Date }>;
    memberSkills: ReadonlyArray<{ skillId: string; level: number }>;
    assessments: ReadonlyArray<{
      skillId: string;
      status: string;
      createdAt: Date;
    }>;
  },
  now: Date = new Date()
) {
  const memberSkillById = new Map(
    input.memberSkills.map((skill) => [skill.skillId, skill])
  );
  const pendingSkillIds = new Set(
    input.assessments
      .filter((assessment) => assessment.status === "PENDING")
      .map((assessment) => assessment.skillId)
  );
  const eligibleNewSkills = input.skills
    .filter((skill) =>
      isNewSkill(skill.createdAt, now) &&
      !memberSkillById.has(skill.id) &&
      !pendingSkillIds.has(skill.id)
    );
  const newSkills = eligibleNewSkills
    .slice(0, 8)
    .map((skill) => ({ id: skill.id, name: skill.name }));
  return { newSkillCount: eligibleNewSkills.length, newSkills };
}
