"use client";

import { FilterX, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [actor, setActor] = useState(query.actor ?? null);
  const update = (changes: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      params.delete(key);
      if (Array.isArray(value))
        value.forEach((item) => params.append(key, item));
      else if (value) params.set(key, value);
    }
    router.push(`/audit-logs?${params.toString()}`);
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
    <div className="space-y-4 border-b border-[var(--border)] pb-5">
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
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="開始日"
              value={query.fromDate}
              onChange={(e) => update({ from: e.target.value })}
            />
            <span>〜</span>
            <Input
              type="date"
              aria-label="終了日"
              value={query.toDate}
              onChange={(e) => update({ to: e.target.value })}
            />
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
        <form className="self-end" action="/audit-logs">
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
              defaultValue={query.q}
              placeholder="氏名・社員番号・スキル・カテゴリ・ロール"
              className="pl-9"
            />
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
          onClick={() => router.push("/audit-logs?period=30")}
        >
          <FilterX className="h-4 w-4" />
          条件をクリア
        </Button>
      </div>
    </div>
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
