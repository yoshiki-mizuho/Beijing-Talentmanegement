"use client";

import { FilterX, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  AuditLogQuery,
  AuditOperationGroup,
  AuditTargetGroup,
} from "../domain/audit-log-query";
import { operationLabels } from "../domain/audit-log-query";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

type Props = {
  query: Omit<AuditLogQuery, "from" | "to"> & { from: string; to: string };
  actors: { id: string; name: string }[];
};
const targetOptions: [AuditTargetGroup, string][] = [
  ["member", "メンバー"],
  ["skill", "スキル"],
  ["role", "ロール"],
  ["assessment", "申請・承認"],
  ["csv", "CSV"],
];
const operationOptions: AuditOperationGroup[] = [
  "create",
  "update",
  "deactivate",
  "delete",
  "approve",
  "correct",
  "reject",
];

export function AuditLogFilters({ query, actors }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actor, setActor] = useState(query.actor ?? null);
  const [fromDate, setFromDate] = useState(query.fromDate);
  const [toDate, setToDate] = useState(query.toDate);
  const [search, setSearch] = useState(query.q);
  const dateError = fromDate && toDate && fromDate > toDate;
  const update = (changes: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      params.delete(key);
      if (Array.isArray(value))
        value.forEach((item) => params.append(key, item));
      else if (value) params.set(key, value);
    }
    startTransition(() => router.push(`/audit-logs?${params.toString()}`));
  };
  const updatePeriod = (from: string, to: string) => {
    if (isValidDate(from) && isValidDate(to) && from <= to) {
      update({ from, to });
    }
  };
  const toggle = (
    key: "target" | "operation",
    value: string,
    selected: string[],
  ) =>
    update({
      [key]: selected.includes(value)
        ? selected.filter((x) => x !== value)
        : [...selected, value],
    });
  return (
    // 読み込み中は data-pending を付け、ページ側の CSS で一覧を薄くする
    <div
      className="space-y-4 border-b border-[var(--border)] pb-5"
      data-pending={isPending ? "true" : undefined}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="期間">
        {[
          ["today", "今日"],
          ["7", "7日"],
          ["30", "30日"],
          ["custom", "期間を指定"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={query.period === value}
            className={chip(query.period === value)}
            onClick={() =>
              update({
                period: value,
                from: value === "custom" ? query.fromDate : null,
                to: value === "custom" ? query.toDate : null,
              })
            }
          >
            {label}
          </button>
        ))}
        {query.period === "custom" ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                aria-label="開始日"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  updatePeriod(e.target.value, toDate);
                }}
              />
              <span>〜</span>
              <Input
                type="date"
                aria-label="終了日"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  updatePeriod(fromDate, e.target.value);
                }}
              />
            </div>
            <p className="mt-1 text-sm text-[var(--danger)]" aria-live="polite">
              {dateError ? "開始日は終了日以前にしてください" : ""}
            </p>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr]">
        <Combobox
          id="audit-actor"
          label="操作した人"
          options={actors.map((item) => ({ value: item.id, label: item.name }))}
          value={actor}
          onChange={(value) => {
            setActor(value);
            update({ actor: value });
          }}
          placeholder="すべて"
        />
        <form
          className="self-end"
          action="/audit-logs"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: search });
          }}
        >
          <input type="hidden" name="period" value={query.period} />
          {query.period === "custom" ? (
            <>
              <input type="hidden" name="from" value={query.fromDate} />
              <input type="hidden" name="to" value={query.toDate} />
            </>
          ) : null}
          {query.targets.map((v) => (
            <input key={v} type="hidden" name="target" value={v} />
          ))}
          {query.operations.map((v) => (
            <input key={v} type="hidden" name="operation" value={v} />
          ))}
          {actor ? <input type="hidden" name="actor" value={actor} /> : null}
          <label className="text-sm font-medium" htmlFor="audit-q">
            対象の名前で検索
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              id="audit-q"
              name="q"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="氏名・社員番号・スキル・カテゴリ・ロール"
              className="pl-9 pr-9"
            />
            {search ? (
              <button
                type="button"
                aria-label="検索をクリア"
                className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded hover:bg-[var(--surface-subtle)]"
                onClick={() => {
                  setSearch("");
                  update({ q: null });
                }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </form>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">対象</span>
        {targetOptions.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={query.targets.includes(value)}
            className={chip(query.targets.includes(value))}
            onClick={() => toggle("target", value, query.targets)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">操作</span>
        {operationOptions.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={query.operations.includes(value)}
            className={chip(query.operations.includes(value))}
            onClick={() => toggle("operation", value, query.operations)}
          >
            {operationLabels[value]}
          </button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="small"
          className="ml-auto"
          onClick={() =>
            startTransition(() => router.push("/audit-logs?period=30"))
          }
        >
          <FilterX className="h-4 w-4" />
          条件をクリア
        </Button>
      </div>
    </div>
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function chip(active: boolean) {
  return cn(
    "min-h-9 rounded-full border px-3 text-sm font-medium",
    active
      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]",
  );
}
