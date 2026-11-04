import { getMemberGrowthData } from "@/modules/growth/application/growth-service";
import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";
import { getSkillReminderData } from "@/modules/dashboard/infrastructure/member-dashboard-repository";

export function getMemberDashboard(memberId: string) {
  return getMemberGrowthData(memberId);
}

export async function getMemberSkillReminders(memberId: string) {
  return buildSkillReminderCards(await getSkillReminderData(memberId));
}
