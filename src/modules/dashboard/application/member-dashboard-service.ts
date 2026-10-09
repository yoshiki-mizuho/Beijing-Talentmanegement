import { getMemberGrowthData } from "@/modules/growth/application/growth-service";

export function getMemberDashboard(memberId: string) {
  return getMemberGrowthData(memberId);
}
