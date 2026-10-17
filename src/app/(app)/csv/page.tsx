import type { Route } from "next";
import Link from "next/link";
import { loadCsvExportCounts } from "@/modules/csv-import/application/csv-export-service";
import type { CsvExportScope } from "@/modules/csv-import/domain/csv-export-columns";
import { CsvExportPanel } from "@/modules/csv-import/presentation/csv-export-panel";
import { CsvImportPanel } from "@/modules/csv-import/presentation/csv-import-panel";
import { adminOnly, requirePageRoles } from "@/server/auth/authorization";
import { cn } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

export default async function CsvPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageRoles(adminOnly);
  const params = await searchParams;
  const tab = params.tab === "export" ? "export" : "import";
  const scope: CsvExportScope = params.scope === "all" ? "all" : "active";
  const counts = await loadCsvExportCounts(scope);
  return (
    <div>
      <h1 className="text-[26px] font-semibold">CSV</h1>
      <div className="mt-4 flex gap-1 border-b border-[var(--border)]" role="tablist" aria-label="CSV の操作">
        <Tab href="/csv?tab=import" active={tab === "import"}>取り込み</Tab>
        <Tab href={`/csv?tab=export&scope=${scope}`} active={tab === "export"}>出力</Tab>
      </div>
      <div className="mt-5">
        {tab === "export" ? <CsvExportPanel scope={scope} counts={counts} /> : <CsvImportPanel />}
      </div>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href as Route} role="tab" aria-selected={active} className={cn("border-b-2 px-5 py-2.5 text-sm", active ? "border-[var(--primary)] font-semibold text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)]")}>
      {children}
    </Link>
  );
}
