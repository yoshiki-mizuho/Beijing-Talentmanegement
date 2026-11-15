import { getMemberGrowthData } from "@/modules/growth/application/growth-service";
import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";
import { listActiveSkillsForReminders } from "@/modules/dashboard/infrastructure/member-dashboard-repository";
import { getBadgeCalculationData } from "@/modules/growth/application/badge-service";
import { listMemberRoleAchievements } from "@/modules/roles/application/role-achievement-service";

export async function getMemberDashboard(memberId: string) {
  const [growthData, badgeData, achievements, skills] = await Promise.all([
    getMemberGrowthData(memberId),
    getBadgeCalculationData(memberId),
    listMemberRoleAchievements(memberId),
    listActiveSkillsForReminders()
  ]);
  return {
    ...growthData,
    roleAchievements: achievements,
    badgeData: { ...badgeData, targetAchievements: achievements },
    skillReminders: buildSkillReminderCards({
      skills,
      memberSkills: growthData.member?.memberSkills ?? [],
      assessments: badgeData.assessments,
      levelChanges: badgeData.levelChanges
    })
  };
}
