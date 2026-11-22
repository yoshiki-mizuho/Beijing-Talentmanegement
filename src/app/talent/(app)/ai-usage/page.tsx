import { getAiUsageSummary } from "@/modules/ai-evaluation/application/ai-usage-service";
import { AiUsageDashboard } from "@/modules/ai-evaluation/presentation/ai-usage-dashboard";
import { adminOnly, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AiUsagePage() {
  await requirePageRoles(adminOnly);
  const summary = await getAiUsageSummary();
  return <AiUsageDashboard summary={summary} />;
}
