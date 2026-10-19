import Link from "next/link";
import type { Route } from "next";
import {
  Bot,
  CircleAlert,
  Gauge,
  RefreshCw,
  Sparkles,
  Timer,
} from "lucide-react";

import type { getAiUsageSummary } from "@/modules/ai-evaluation/application/ai-usage-service";
import { shiftMonth } from "@/modules/ai-evaluation/domain/ai-usage-summary";
import { Badge } from "@/shared/ui/badge";
import { ChartPanel } from "@/shared/ui/chart-panel";
import { EmptyState } from "@/shared/ui/empty-state";
import { Metric } from "@/shared/ui/metric";
import { AiUsageChart } from "./ai-usage-chart";

type Summary = Awaited<ReturnType<typeof getAiUsageSummary>>;

export function AiUsageDashboard({
  summary,
  currentMonth,
}: {
  summary: Summary;
  currentMonth: string;
}) {
  const previous = shiftMonth(summary.month.key, -1);
  const next = shiftMonth(summary.month.key, 1);
  const averageSeconds =
    summary.averageSuccessLatencyMs === null
      ? 0
      : summary.averageSuccessLatencyMs / 1000;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">AI の利用状況</h1>
        <div className="flex min-h-11 items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3">
          <Link
            aria-label="前の月"
            href={`/ai-usage?month=${previous}` as Route}
            className="p-2"
          >
            ‹
          </Link>
          <span className="text-sm font-semibold">{summary.month.label}</span>
          {next <= currentMonth ? (
            <Link
              aria-label="次の月"
              href={`/ai-usage?month=${next}` as Route}
              className="p-2"
            >
              ›
            </Link>
          ) : (
            <span
              className="p-2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            >
              ›
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="実行回数"
          value={summary.total}
          caption="その月のすべての実行"
          icon={RefreshCw}
        />
        <Metric
          label="AI で作成"
          value={summary.counts.SUCCESS}
          caption="AI の応答を保存"
          icon={Sparkles}
          tone="green"
        />
        <Metric
          label="簡易版"
          value={summary.counts.FALLBACK}
          caption="AI を使わずに作成"
          icon={Bot}
          tone="amber"
        />
        <Metric
          label="失敗"
          value={summary.counts.FAILED}
          caption={`${summary.counts.FAILED}件（${summary.failurePercentage}%）`}
          icon={CircleAlert}
          tone="coral"
        />
        <TokenMetric total={summary.totalTokens} limit={summary.tokenLimit} />
        <Metric
          label="平均の所要時間"
          value={Number(averageSeconds.toFixed(1))}
          caption="秒（AI で作成した実行）"
          icon={Timer}
        />
      </div>
      <ChartPanel title="日ごとの実行回数">
        {summary.total === 0 ? (
          <EmptyState
            icon={Gauge}
            title="この月の実行はありません"
            description="別の月を選んでください。"
          />
        ) : (
          <AiUsageChart data={summary.days} />
        )}
      </ChartPanel>
      <RecentTable items={summary.recent} />
    </div>
  );
}

function TokenMetric({
  total,
  limit,
}: {
  total: number;
  limit: number | null;
}) {
  const percentage = limit ? Math.min((total / limit) * 100, 100) : 0;
  const warning = limit !== null && percentage >= 80;
  return (
    <div className="flex min-h-32 flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        トークン数
      </p>
      <div>
        <p className="text-2xl font-semibold">
          {total.toLocaleString("ja-JP")}
          {limit ? ` / ${limit.toLocaleString("ja-JP")}` : ""}
        </p>
        {limit ? (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className={`h-full ${warning ? "bg-amber-600" : "bg-[var(--primary)]"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        ) : (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            上限なし
          </p>
        )}
        {warning ? (
          <p className="mt-1 text-xs font-medium text-amber-800">
            上限の80%以上を利用
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RecentTable({ items }: { items: Summary["recent"] }) {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <ChartPanel title="最近の実行">
      {items.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="この月の実行はありません"
          description="育成のヒントを作ると、ここに表示されます。"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-[var(--muted-foreground)]">
                <th className="p-3">日時</th>
                <th className="p-3">操作した人</th>
                <th className="p-3">対象のメンバー</th>
                <th className="p-3">状態</th>
                <th className="p-3">モデル</th>
                <th className="p-3 text-right">トークン数</th>
                <th className="p-3 text-right">所要時間</th>
                <th className="p-3">理由</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-3">{formatter.format(item.createdAt)}</td>
                  <td className="p-3">{item.actorName}</td>
                  <td className="p-3">{item.targetName}</td>
                  <td className="p-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="p-3">{item.model ?? "—"}</td>
                  <td className="p-3 text-right">
                    {item.totalTokens?.toLocaleString("ja-JP") ?? "—"}
                  </td>
                  <td className="p-3 text-right">
                    {(item.latencyMs / 1000).toFixed(1)}秒
                  </td>
                  <td className="p-3">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartPanel>
  );
}

function StatusBadge({
  status,
}: {
  status: "SUCCESS" | "FALLBACK" | "FAILED";
}) {
  return (
    <Badge>
      {status === "SUCCESS" ? "AI" : status === "FALLBACK" ? "簡易版" : "失敗"}
    </Badge>
  );
}
