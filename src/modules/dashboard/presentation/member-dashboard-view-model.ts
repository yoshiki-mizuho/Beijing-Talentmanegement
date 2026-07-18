import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import type { MemberDashboardData } from "@/modules/dashboard/infrastructure/member-dashboard-repository";

export function buildMemberDashboardViewModel(data: MemberDashboardData) {
  if (!data.member) {
    return null;
  }

  const skills = data.member.memberSkills.map((memberSkill) => ({
    id: memberSkill.skillId,
    name: memberSkill.skill.name,
    categoryName: memberSkill.skill.category.name,
    level: memberSkill.level
  }));
  const roleCandidates = data.roles
    .filter((role) => role.roleRequirements.length > 0)
    .map((role) => {
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
          requiredLevel: requirement.requiredLevel,
          shortfall: requirement.requiredLevel - (requirement.memberLevel ?? 0)
        };
      });

      return {
        id: role.id,
        name: role.name,
        achievementRate: Math.round(evaluation.achievementRate * 100),
        achieved: evaluation.achieved,
        requiredSkillCount: role.roleRequirements.length,
        satisfiedSkillCount: evaluation.satisfiedRequirements.length,
        gaps,
        totalShortfall: gaps.reduce((sum, gap) => sum + gap.shortfall, 0)
      };
    })
    .sort(
      (left, right) =>
        right.achievementRate - left.achievementRate ||
        left.totalShortfall - right.totalShortfall ||
        left.name.localeCompare(right.name, "ja")
    );
  const targetRole = roleCandidates[0] ?? null;
  const averageLevel =
    skills.length === 0
      ? 0
      : Math.round(
          (skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length) * 10
        ) / 10;
  const actions = [
    ...(skills.length === 0
      ? [
          {
            id: "register-skill",
            title: "最初のスキルを申告する",
            description: "現在の経験に合うスキルとレベルを登録しましょう。",
            href: "/my/skills"
          }
        ]
      : []),
    ...(targetRole && targetRole.gaps.length > 0
      ? [
          {
            id: "close-role-gap",
            title: `${targetRole.name}に向けてスキルを伸ばす`,
            description: `不足している必須スキルは${targetRole.gaps.length}件です。`,
            href: "/my/skills"
          }
        ]
      : []),
    ...(data.pendingAssessmentCount > 0
      ? [
          {
            id: "check-assessment",
            title: "申告状況を確認する",
            description: `${data.pendingAssessmentCount}件の申告が承認待ちです。`,
            href: "/my/skills"
          }
        ]
      : []),
    ...(data.unreadNotificationCount > 0
      ? [
          {
            id: "read-notifications",
            title: "通知を確認する",
            description: `${data.unreadNotificationCount}件の未読通知があります。`,
            href: "/notifications"
          }
        ]
      : [])
  ];

  return {
    memberName: data.member.name,
    skillCount: skills.length,
    averageLevel,
    pendingAssessmentCount: data.pendingAssessmentCount,
    unreadNotificationCount: data.unreadNotificationCount,
    skills: [...skills].sort(
      (left, right) => right.level - left.level || left.name.localeCompare(right.name, "ja")
    ),
    targetRole,
    actions
  };
}

export type MemberDashboardViewModel = NonNullable<
  ReturnType<typeof buildMemberDashboardViewModel>
>;
