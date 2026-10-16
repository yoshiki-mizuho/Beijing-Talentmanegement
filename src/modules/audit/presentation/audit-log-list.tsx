import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import type { AuditLogListItem } from "../application/audit-log-service";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/utils";

const dateHeading = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "long",
  day: "numeric",
  weekday: "short",
});
const time = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dateKey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" });

export function AuditLogList({
  items,
  total,
  page,
  pageCount,
  queryString,
}: {
  items: AuditLogListItem[];
  total: number;
  page: number;
  pageCount: number;
  queryString: string;
}) {
  if (!items.length)
    return (
      <EmptyState
        icon={ScrollText}
        title="条件に一致する監査ログがありません"
        description="検索条件を変更してください。"
      />
    );
  const groups = items.reduce((map, item) => {
    const key = dateKey.format(new Date(item.occurredAt));
    map.set(key, [...(map.get(key) ?? []), item]);
    return map;
  }, new Map<string, AuditLogListItem[]>());
  const href = (next: number) => {
    const params = new URLSearchParams(queryString);
    params.set("page", String(next));
    return `/audit-logs?${params}`;
  };
  const start = (page - 1) * 50 + 1;
  const end = Math.min(page * 50, total);
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([date, rows]) => (
        <section key={date} aria-labelledby={`date-${date}`}>
          <h2
            id={`date-${date}`}
            className="mb-2 text-sm font-semibold text-[var(--muted-foreground)]"
          >
            {dateHeading.format(new Date(`${date}T12:00:00+09:00`))}
          </h2>
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {rows.map((item) => (
              <AuditRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted-foreground)]">
        <p>
          {total}件中 {start}〜{end}件
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              className="rounded-md border p-2"
              aria-label="前のページ"
              href={href(page - 1) as Route}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : null}
          <span>
            {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              className="rounded-md border p-2"
              aria-label="次のページ"
              href={href(page + 1) as Route}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AuditRow({ item }: { item: AuditLogListItem }) {
  const targetHref = getTargetHref(item);
  return (
    <details className="group bg-[var(--surface)] first:rounded-t-xl last:rounded-b-xl">
      <summary className="grid cursor-pointer list-none grid-cols-[3.5rem_2rem_1fr] items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden md:grid-cols-[3.5rem_2rem_minmax(0,1fr)_minmax(10rem,auto)]">
        <time className="text-sm text-[var(--muted-foreground)]">
          {time.format(new Date(item.occurredAt))}
        </time>
        {item.actor ? (
          <MemberAvatar
            memberId={item.actor.id}
            name={item.actor.name}
            avatarUpdatedAt={item.actor.avatarUpdatedAt}
            size="sm"
          />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs">
            S
          </span>
        )}
        <div className="min-w-0 text-sm">
          <strong>{item.actor?.name ?? "システム"}</strong> が{" "}
          {item.description.prefix}
          {targetHref ? (
            <Link
              href={targetHref as Route}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              {item.description.target}
            </Link>
          ) : (
            <strong>{item.description.target}</strong>
          )}
          {item.description.suffix}{" "}
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
              operationPill(item.operation),
            )}
          >
            {item.operationLabel}
          </span>
        </div>
        <p className="col-start-3 break-words text-sm text-[var(--muted-foreground)] md:col-start-4 md:text-right">
          {item.summary}
        </p>
      </summary>
      <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-4">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-left">
              <th className="w-1/3 py-2">項目</th>
              <th className="w-1/3 py-2">変更前</th>
              <th className="w-1/3 py-2">変更後</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {item.diffRows.map((row) => (
              <tr key={row.field}>
                <th className="break-words py-2 pr-2 text-left font-medium">
                  {row.label}
                </th>
                <DiffCells row={row} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function getTargetHref(item: AuditLogListItem) {
  if (!item.targetExists) return null;
  switch (item.targetType) {
    case "Member":
      return item.targetId ? `/people/${item.targetId}` : null;
    case "MemberSkill":
    case "SkillSelfAssessment":
      return item.memberId ? `/people/${item.memberId}` : null;
    case "Skill":
    case "SkillCategory":
      return "/skills";
    case "Role":
      return "/roles";
    default:
      return null;
  }
}

function DiffCells({ row }: { row: AuditLogListItem["diffRows"][number] }) {
  if (row.content) {
    return (
      <td className="break-words py-2" colSpan={2}>
        {row.content}
      </td>
    );
  }
  if (row.redacted) {
    return (
      <td className="break-words py-2" colSpan={2}>
        変更あり（内容は記録していません）
      </td>
    );
  }
  return (
    <>
      <td className="break-words py-2 pr-2">
        <del>{row.before}</del>
      </td>
      <td className="break-words py-2 font-semibold">{row.after}</td>
    </>
  );
}

function operationPill(operation: AuditLogListItem["operation"]) {
  switch (operation) {
    case "create":
      return "bg-emerald-50 text-emerald-800";
    case "update":
      return "bg-blue-50 text-blue-800";
    case "deactivate":
    case "delete":
      return "bg-red-50 text-red-800";
    case "reject":
      return "bg-orange-50 text-orange-800";
    case "export":
      return "bg-[var(--surface-subtle)] text-[var(--foreground)]";
    default:
      return "bg-[var(--primary-subtle)] text-[var(--primary)]";
  }
}
