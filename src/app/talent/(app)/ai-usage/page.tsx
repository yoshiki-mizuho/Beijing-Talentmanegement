import { getAiUsageSummary } from "@/modules/ai-evaluation/application/ai-usage-service";
import { formatTokyoMonth } from "@/modules/ai-evaluation/domain/ai-usage-summary";
import { AiUsageDashboard } from "@/modules/ai-evaluation/presentation/ai-usage-dashboard";
import { adminOnly, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requirePageRoles(adminOnly);
  const params = await searchParams;
  const summary = await getAiUsageSummary(params.month);
  return (
    <AiUsageDashboard
      summary={summary}
      currentMonth={formatTokyoMonth(new Date())}
    />
  );
}
