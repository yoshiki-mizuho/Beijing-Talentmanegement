import { buildDashboardSummary } from "@/modules/dashboard/domain/dashboard-summary";
import { getDashboardData } from "@/modules/dashboard/infrastructure/dashboard-repository";

export async function getDashboardSummary() {
  return buildDashboardSummary(await getDashboardData());
}
