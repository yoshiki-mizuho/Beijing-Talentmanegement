import type { AuthRole } from "@prisma/client";
import { buildOrganizationDashboard } from "@/modules/dashboard/domain/dashboard-summary";
import { getOrganizationDashboardData } from "@/modules/dashboard/infrastructure/dashboard-repository";
import { getMemberScope } from "@/modules/members/application/member-scope";

export async function getDashboardSummary(role: AuthRole, memberId: string, departmentId?: string) {
  const scope = await getMemberScope(role, memberId, departmentId);
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { scope, summary: buildOrganizationDashboard({ ...(await getOrganizationDashboardData(scope.memberIds, from)), now }) };
}
