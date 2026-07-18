import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

export type DashboardMember = {
  id: string;
  memberSkills: {
    skillId: string;
    level: number;
  }[];
};

export type DashboardRole = {
  id: string;
  name: string;
  roleRequirements: {
    skillId: string;
    requiredLevel: number;
    isRequired: boolean;
  }[];
};

export type DashboardSkillCategory = {
  id: string;
  name: string;
  _count: {
    skills: number;
  };
};

export function buildDashboardSummary(input: {
  members: DashboardMember[];
  skillsCount: number;
  activeSkillsCount: number;
  roles: DashboardRole[];
  categories: DashboardSkillCategory[];
  pendingAssessmentsCount: number;
  unreadNotificationsCount: number;
}) {
  const membersWithoutSkills = input.members.filter(
    (member) => member.memberSkills.length === 0
  ).length;
  const roleSummaries = input.roles.map((role) => {
    const achievedMembers = input.members.filter((member) =>
      evaluateRoleAchievement(
        role.roleRequirements,
        member.memberSkills
      ).achieved
    ).length;

    return {
      id: role.id,
      name: role.name,
      requiredSkillCount: role.roleRequirements.filter(
        (requirement) => requirement.isRequired
      ).length,
      achievedMembers,
      achievementRate:
        input.members.length === 0 ? 0 : achievedMembers / input.members.length
    };
  });

  return {
    memberCount: input.members.length,
    skillCount: input.skillsCount,
    activeSkillsCount: input.activeSkillsCount,
    membersWithoutSkills,
    pendingAssessmentsCount: input.pendingAssessmentsCount,
    unreadNotificationsCount: input.unreadNotificationsCount,
    roleSummaries,
    categorySummaries: input.categories.map((category) => ({
      id: category.id,
      name: category.name,
      skillCount: category._count.skills
    }))
  };
}
