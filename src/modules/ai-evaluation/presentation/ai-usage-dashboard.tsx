import { CircleAlert, Gauge, RefreshCw } from "lucide-react";

import { getAiFeatureName, type getAiUsageSummary } from "@/modules/ai-evaluation/application/ai-usage-service";
import { Badge } from "@/shared/ui/badge";
import { ChartPanel } from "@/shared/ui/chart-panel";
import { EmptyState } from "@/shared/ui/empty-state";
import { Metric } from "@/shared/ui/metric";

type Summary = Awaited<ReturnType<typeof getAiUsageSummary>>;

export function AiUsageDashboard({ summary }: { summary: Summary }) {
  const totals = summary.days.reduce((result, day) => ({
    succeeded: result.succeeded + day.SUCCEEDED,
    failed: result.failed + day.FAILED,
    waiting: result.waiting + day.QUEUED,
    running: result.running + day.RUNNING,
  }), { succeeded: 0, failed: 0, waiting: 0, running: 0 });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">AI の利用状況</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="成功" value={totals.succeeded} caption="直近30日" icon={RefreshCw} tone="green" />
        <Metric label="失敗" value={totals.failed} caption="直近30日" icon={CircleAlert} tone="coral" />
        <Metric label="待ち" value={totals.waiting} caption="現在を含む直近30日" icon={Gauge} />
        <Metric label="実行中" value={totals.running} caption="現在を含む直近30日" icon={Gauge} />
      </div>
      <ChartPanel title="今日の予約">
        <p className="text-2xl font-semibold">{summary.todayCount} / {summary.dailyLimit}件</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full bg-[var(--primary)]" style={{ width: `${Math.min(100, summary.todayCount / summary.dailyLimit * 100)}%` }} />
        </div>
      </ChartPanel>
      <ChartPanel title="日ごとの作成回数（直近30日）">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b text-left text-[var(--muted-foreground)]"><th className="p-2">日</th><th className="p-2">成功</th><th className="p-2">失敗</th><th className="p-2">待ち</th><th className="p-2">実行中</th><th className="p-2">育成</th><th className="p-2">提案</th><th className="p-2">前提</th></tr></thead>
            <tbody>{summary.days.map((day) => <tr key={day.date.toISOString()} className="border-b"><td className="p-2">{formatDate(day.date)}</td><td className="p-2">{day.SUCCEEDED}</td><td className="p-2">{day.FAILED}</td><td className="p-2">{day.QUEUED}</td><td className="p-2">{day.RUNNING}</td><td className="p-2">{day.GROWTH_HINT}</td><td className="p-2">{day.PROPOSAL_SHEET}</td><td className="p-2">{day.SKILL_PREREQUISITE}</td></tr>)}</tbody>
          </table>
        </div>
      </ChartPanel>
      <ChartPanel title="最近の失敗">
        {summary.recentFailures.length === 0 ? <EmptyState icon={Gauge} title="失敗はありません" /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">日時</th><th className="p-3">種類</th><th className="p-3">エラー</th></tr></thead><tbody>{summary.recentFailures.map((item) => <tr key={item.id} className="border-b"><td className="p-3">{formatDateTime(item.createdAt)}</td><td className="p-3"><Badge>{getAiFeatureName(item.kind)}</Badge></td><td className="p-3">{item.errorCode}</td></tr>)}</tbody></table></div>
        )}
      </ChartPanel>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}
