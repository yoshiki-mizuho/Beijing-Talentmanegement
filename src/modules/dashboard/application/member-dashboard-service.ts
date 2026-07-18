import { getMemberDashboardData } from "@/modules/dashboard/infrastructure/member-dashboard-repository";

export function getMemberDashboard(memberId: string) {
  return getMemberDashboardData(memberId);
}
