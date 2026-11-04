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
    levelChanges: ReadonlyArray<{ skillId: string; changedAt: Date }>;
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
  const latestActivityBySkillId = new Map<string, Date>();

  for (const activity of [...input.assessments, ...input.levelChanges]) {
    const date = "createdAt" in activity ? activity.createdAt : activity.changedAt;
    const current = latestActivityBySkillId.get(activity.skillId);
    if (!current || date > current) latestActivityBySkillId.set(activity.skillId, date);
  }

  const eligibleNewSkills = input.skills
    .filter((skill) =>
      isNewSkill(skill.createdAt, now) &&
      !memberSkillById.has(skill.id) &&
      !pendingSkillIds.has(skill.id)
    );
  const newSkills = eligibleNewSkills
    .slice(0, 8)
    .map((skill) => ({ id: skill.id, name: skill.name }));
  const staleSkills = input.skills.flatMap((skill) => {
    const memberSkill = memberSkillById.get(skill.id);
    const lastActivityAt = latestActivityBySkillId.get(skill.id);
    if (!memberSkill || !lastActivityAt || pendingSkillIds.has(skill.id)) return [];
    const elapsed = now.getTime() - lastActivityAt.getTime();
    if (elapsed < 180 * 24 * 60 * 60 * 1000) return [];
    return [{
      id: skill.id,
      name: skill.name,
      level: memberSkill.level,
      monthsAgo: Math.max(6, Math.floor(elapsed / (30 * 24 * 60 * 60 * 1000))),
      lastActivityAt
    }];
  }).sort((left, right) =>
    left.lastActivityAt.getTime() - right.lastActivityAt.getTime()
  ).slice(0, 3);

  return { newSkillCount: eligibleNewSkills.length, newSkills, staleSkills };
}
