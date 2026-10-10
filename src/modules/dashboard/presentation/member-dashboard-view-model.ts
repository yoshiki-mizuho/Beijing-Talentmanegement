import { badgeDefinitions, badgeRarities } from "@/modules/growth/domain/badge-art";
import {
  calculateBadgeAchievements,
  calculateCategoryAverages,
  findPotentialMentors,
  getMonthlyEncouragement,
  getTokyoDateParts
} from "@/modules/growth/domain/growth-insights";
import type { MemberGrowthData } from "@/modules/growth/infrastructure/member-growth-repository";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

export function buildMemberDashboardViewModel(
  data: MemberGrowthData,
  now: Date = new Date()
) {
  if (!data.member) return null;

  const skills = data.member.memberSkills.map((memberSkill) => ({
    id: memberSkill.skillId,
    name: memberSkill.skill.name,
    categoryId: memberSkill.skill.category.id,
    categoryName: memberSkill.skill.category.name,
    level: memberSkill.level
  }));
  const targetRole = data.member.targetRole
    ? buildTargetRole(data.member.targetRole, skills)
    : null;
  const achievements = calculateBadgeAchievements({
    assessments: data.assessments,
    memberSkills: data.member.memberSkills,
    levelChanges: data.levelChanges,
    targetRequirements: data.member.targetRole?.roleRequirements ?? [],
    mentoredCheers: data.mentoredCheers
  });
  const achievementById = new Map(
    achievements.map((achievement) => [achievement.id, achievement])
  );
  const currentSkillIds = new Set(skills.map((skill) => skill.id));
  const nowParts = getTokyoDateParts(now);
  const monthlyLevelUps = data.levelChanges.filter((change) => {
    const parts = getTokyoDateParts(change.changedAt);
    return (
      change.source !== "BACKFILL" &&
      (change.fromLevel === null || change.toLevel > change.fromLevel) &&
      parts.year === nowParts.year &&
      parts.month === nowParts.month
    );
  }).length;

  return {
    memberId: data.member.id,
    memberName: data.member.name,
    encouragement: getMonthlyEncouragement(monthlyLevelUps),
    targetRole,
    roleOptions: data.roles,
    badges: badgeDefinitions.map((definition) => ({
      ...definition,
      rarityLabel: badgeRarities[definition.rarity].label,
      frameColor: badgeRarities[definition.rarity].frame,
      backgroundColor: badgeRarities[definition.rarity].background,
      earnedAt:
        achievementById.get(definition.id)?.earnedAt?.toISOString() ?? null
    })),
    radar: calculateCategoryAverages(
      data.categories,
      skills.map((skill) => ({
        categoryId: skill.categoryId,
        level: skill.level
      }))
    ),
    calendar: {
      initialYear: nowParts.year,
      initialMonth: nowParts.month - 1,
      assessmentDates: data.assessments.map((assessment) =>
        assessment.createdAt.toISOString()
      ),
      levelChanges: data.levelChanges.map((change) => ({
        skillId: change.skillId,
        fromLevel: change.fromLevel,
        toLevel: change.toLevel,
        source: change.source,
        changedAt: change.changedAt.toISOString()
      }))
    },
    timeline: [...data.levelChanges]
      .filter(
        (change) =>
          change.source !== "BACKFILL" && currentSkillIds.has(change.skillId)
      )
      .sort((left, right) => right.changedAt.getTime() - left.changedAt.getTime())
      .slice(0, 8)
      .map((change) => ({
        id: change.id,
        skillName: change.skill.name,
        categoryName: change.skill.category.name,
        fromLevel: change.fromLevel,
        toLevel: change.toLevel,
        changedAt: change.changedAt.toISOString()
      })),
    mentors: findPotentialMentors({
      memberId: data.member.id,
      targetGaps: targetRole
        ? targetRole.gaps.map((gap) => ({
            skillId: gap.skillId,
            skillName: gap.skillName
          }))
        : null,
      memberSkills: skills.map((skill) => ({
        skillId: skill.id,
        skillName: skill.name,
        level: skill.level
      })),
      candidates: data.mentorCandidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        jobTitle: candidate.jobTitle,
        status: candidate.status,
        skills: candidate.memberSkills.map((skill) => ({
          skillId: skill.skillId,
          skillName: skill.skill.name,
          level: skill.level
        }))
      }))
    }),
    cheers: data.receivedCheers.map((cheer) => ({
      id: cheer.id,
      senderName: cheer.fromMember.name,
      message: cheer.message,
      createdAt: cheer.createdAt.toISOString(),
      mentor: cheer.mentorMember && cheer.targetSkill ? {
        name: cheer.mentorMember.name,
        skillName: cheer.targetSkill.name,
        level: cheer.mentorMember.memberSkills.find((skill) => skill.skillId === cheer.targetSkill?.id)?.level ?? null
      } : null
    }))
  };
}

function buildTargetRole(
  role: NonNullable<NonNullable<MemberGrowthData["member"]>["targetRole"]>,
  skills: Array<{ id: string; name: string; level: number; categoryName: string }>
) {
  const evaluation = evaluateRoleAchievement(
    role.roleRequirements.map((requirement) => ({
      skillId: requirement.skillId,
      skillName: requirement.skill.name,
      requiredLevel: requirement.requiredLevel,
      isRequired: requirement.isRequired
    })),
    skills.map((skill) => ({
      skillId: skill.id,
      skillName: skill.name,
      level: skill.level
    }))
  );
  const gaps = evaluation.missingRequirements.map((requirement) => {
    const source = role.roleRequirements.find(
      (candidate) => candidate.skillId === requirement.skillId
    );
    return {
      skillId: requirement.skillId,
      skillName: requirement.skillName ?? "未設定スキル",
      categoryName: source?.skill.category.name ?? "未分類",
      currentLevel: requirement.memberLevel,
      requiredLevel: requirement.requiredLevel
    };
  });

  return {
    id: role.id,
    name: role.name,
    achievementRate:
      role.roleRequirements.length === 0
        ? 0
        : Math.round(evaluation.achievementRate * 100),
    achieved: evaluation.achieved && role.roleRequirements.length > 0,
    requiredSkillCount: role.roleRequirements.length,
    satisfiedSkillCount: evaluation.satisfiedRequirements.length,
    gaps
  };
}

export type MemberDashboardViewModel = NonNullable<
  ReturnType<typeof buildMemberDashboardViewModel>
>;
