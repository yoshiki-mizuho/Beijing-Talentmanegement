import { getMemberGrowthData } from "@/modules/growth/application/growth-service";
import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";
import { getSkillReminderData } from "@/modules/dashboard/infrastructure/member-dashboard-repository";
import { getBadgeCalculationData } from "@/modules/growth/infrastructure/badge-calculation-repository";
import { listMemberRoleAchievements } from "@/modules/roles/application/role-achievement-service";

export async function getMemberDashboard(memberId: string) {
  const [growthData, badgeData, achievements] = await Promise.all([
    getMemberGrowthData(memberId),
    getBadgeCalculationData(memberId),
    listMemberRoleAchievements(memberId)
  ]);
  return {
    ...growthData,
    roleAchievements: achievements,
    badgeData: { ...badgeData, targetAchievements: achievements }
  };
}

export async function getMemberSkillReminders(memberId: string) {
  return buildSkillReminderCards(await getSkillReminderData(memberId));
}
