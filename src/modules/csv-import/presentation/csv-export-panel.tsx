import {
  Building2,
  Download,
  ListChecks,
  Target,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  csvExportDefinitions,
  csvExportTargets,
  type CsvExportScope,
  type CsvExportTarget,
} from "../domain/csv-export-columns";
import { cn } from "@/shared/lib/utils";

const icons: Record<CsvExportTarget, LucideIcon> = {
  departments: Building2,
  members: Users,
  skills: WandSparkles,
  "member-skills": ListChecks,
  roles: Target,
};

export function CsvExportPanel({
  scope,
  counts,
}: {
  scope: CsvExportScope;
  counts: Record<Exclude<CsvExportTarget, "roles">, number> & {
    roles: { roles: number; requirements: number };
  };
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--muted-foreground)]">
          メンバーの範囲
        </span>
        <ScopeLink scope="active" current={scope}>
          在籍中
        </ScopeLink>
        <ScopeLink scope="all" current={scope}>
          すべて（休職・退職を含む）
        </ScopeLink>
      </div>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {csvExportTargets.map((target) => {
          const definition = csvExportDefinitions[target];
          const Icon = icons[target];
          return (
            <div
              key={target}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-4 px-5 py-4 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {definition.label}{" "}
                  <span className="text-sm font-normal text-[var(--muted-foreground)]">
                    {target === "roles"
                      ? `${counts.roles.roles}件（要件 ${counts.roles.requirements}件）`
                      : `${counts[target]}件`}
                  </span>
                </p>
                <p className="truncate text-xs text-[var(--muted-foreground)]">
                  {definition.columns.join(", ")}
                </p>
              </div>
              <a
                href={`/api/csv/export/${target}?scope=${scope}`}
                download
                aria-label={`${definition.label}のCSVを出力`}
                className="col-start-2 inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] sm:col-start-3 sm:row-start-1"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                CSVで出力
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScopeLink({
  scope,
  current,
  children,
}: {
  scope: CsvExportScope;
  current: CsvExportScope;
  children: React.ReactNode;
}) {
  const active = scope === current;
  return (
    <Link
      href={`/csv?tab=export&scope=${scope}`}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium",
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]",
      )}
    >
      {children}
    </Link>
  );
}
