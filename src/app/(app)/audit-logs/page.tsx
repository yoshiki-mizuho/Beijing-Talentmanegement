import { listAuditLogs } from "@/modules/audit/application/audit-log-service";
import { AuditLogFilters } from "@/modules/audit/presentation/audit-log-filters";
import { AuditLogList } from "@/modules/audit/presentation/audit-log-list";
import { Card, CardContent } from "@/shared/ui/card";
import { adminOnly, requirePageRoles } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageRoles(adminOnly);
  const params = await searchParams;
  const result = await listAuditLogs(params);
  const queryString = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((item) => [key, item])
        : value
          ? [[key, value]]
          : [],
    ),
  ).toString();
  return (
    <Card>
      <CardContent className="space-y-5 pt-5 [&:has([data-pending])_#audit-log-list]:opacity-50">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <h1 className="text-2xl font-semibold">
            監査ログ{" "}
            <span className="text-base font-medium text-[var(--muted-foreground)]">
              {result.query.period === "30"
                ? "直近30日"
                : `${result.query.fromDate}〜${result.query.toDate}`}
              ・{result.total}件
            </span>
          </h1>
        </div>
        <AuditLogFilters query={result.query} actors={result.actors} />
        <AuditLogList
          items={result.items}
          total={result.total}
          page={result.page}
          pageCount={result.pageCount}
          queryString={queryString}
        />
      </CardContent>
    </Card>
  );
}
