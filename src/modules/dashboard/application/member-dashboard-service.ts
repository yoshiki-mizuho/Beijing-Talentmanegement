import { getMemberGrowthData } from "@/modules/growth/application/growth-service";
import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";
import { getSkillReminderData } from "@/modules/dashboard/infrastructure/member-dashboard-repository";
import { getBadgeCalculationData } from "@/modules/growth/infrastructure/badge-calculation-repository";

export async function getMemberDashboard(memberId: string) {
  const [growthData, badgeData] = await Promise.all([
    getMemberGrowthData(memberId),
    getBadgeCalculationData(memberId)
  ]);
  return { ...growthData, badgeData };
}

export async function getMemberSkillReminders(memberId: string) {
  return buildSkillReminderCards(await getSkillReminderData(memberId));
}
