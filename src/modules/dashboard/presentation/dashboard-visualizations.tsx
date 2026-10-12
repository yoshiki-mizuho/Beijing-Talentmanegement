import Link from "next/link";
import type { buildOrganizationDashboard } from "@/modules/dashboard/domain/dashboard-summary";

type Summary = ReturnType<typeof buildOrganizationDashboard>;
export function DashboardVisualizations({
  summary,
  showDepartments,
}: {
  summary: Summary;
  showDepartments: boolean;
}) {
  const metrics = [
    [
      "今月のレベルアップ",
      `${summary.currentMonthLevelUps}件`,
      `${summary.monthOverMonth >= 0 ? "↑" : "↓"} 先月比 ${Math.abs(summary.monthOverMonth)}件`,
    ],
    [
      "Lv4以上を持つ人の割合",
      `${summary.memberCount ? Math.round((summary.highLevelMembers / summary.memberCount) * 100) : 0}%`,
      `${summary.memberCount}名中 ${summary.highLevelMembers}名`,
    ],
    [
      "ロール達成者",
      `${summary.achievedCount}名`,
      `目標設定者 ${summary.targetedCount}名中`,
    ],
    [
      "承認待ち",
      `${summary.pendingCount}件`,
      summary.stalePendingCount
        ? `⚠ 7日以上 ${summary.stalePendingCount}件`
        : "7日以上の待ちはありません",
    ],
  ];
  const maxMonthly = Math.max(
    1,
    ...summary.monthlyLevelUps.map((item) => item.count),
  );
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, note], index) => (
          <article
            key={label}
            className={`rounded-2xl border bg-white p-5 ${index === 3 && summary.stalePendingCount ? "border-amber-400" : "border-[var(--border)]"}`}
          >
            <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            <p
              className={`mt-2 text-xs ${index === 3 && summary.stalePendingCount ? "font-semibold text-amber-800" : "text-[var(--muted-foreground)]"}`}
            >
              {note}
            </p>
          </article>
        ))}
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="レベルアップの推移">
          <div
            role="img"
            aria-label={summary.monthlyLevelUps
              .map((item) => `${item.label}${item.count}件`)
              .join("、")}
            className="flex h-64 items-end gap-3 pt-8"
          >
            {summary.monthlyLevelUps.map((item, index) => (
              <div
                key={item.label}
                className="flex h-full flex-1 flex-col justify-end text-center"
              >
                <div
                  className="relative mx-auto w-full max-w-14 rounded-t bg-[var(--primary)]"
                  title={`${item.label} ${item.count}件`}
                  style={{
                    height: `${Math.max(4, (item.count / maxMonthly) * 100)}%`,
                  }}
                >
                  {index === 5 ? (
                    <span className="absolute -top-6 inset-x-0 text-sm font-bold">
                      {item.count}
                    </span>
                  ) : null}
                </div>
                <span className="mt-2 text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="不足しているスキル">
          <Bars
            items={summary.missingSkills.map((item) => ({
              id: item.skillId,
              label: item.name,
              value: item.count,
              suffix: "人",
            }))}
          />
          <Link
            href="/skill-map"
            className="mt-4 inline-block text-sm font-bold text-[var(--primary)]"
          >
            スキルマップで見る →
          </Link>
        </Panel>
      </div>
      {showDepartments ? (
        <Panel title="部署ごとの状況">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted-foreground)]">
                  <th className="py-3">部署</th>
                  <th>人数</th>
                  <th>ロール達成率</th>
                  <th>今月のレベルアップ</th>
                  <th>承認待ち</th>
                </tr>
              </thead>
              <tbody>
                {summary.departmentSummaries.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)]">
                    <td className="py-3 font-semibold">{item.name}</td>
                    <td>{item.memberCount}名</td>
                    <td>
                      <Progress value={item.achievedRate} />
                      {item.achievedRate}%
                    </td>
                    <td>{item.levelUps}件</td>
                    <td
                      className={
                        item.stalePending ? "font-semibold text-amber-800" : ""
                      }
                    >
                      {item.pending}件
                      {item.stalePending ? ` ⚠ ${item.stalePending}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
      <Panel title="ロールの充足">
        <Bars
          items={summary.roleSummaries.map((item) => ({
            id: item.id,
            label: item.name,
            value: item.achievedCount,
            total: item.targetCount,
            suffix: `/${item.targetCount}名`,
          }))}
        />
      </Panel>
    </>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <h2 className="mb-5 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <span className="mr-2 inline-block h-2 w-24 overflow-hidden rounded-full bg-[var(--muted)]">
      <span
        className="block h-full bg-[var(--primary)]"
        style={{ width: `${value}%` }}
      />
    </span>
  );
}
function Bars({
  items,
}: {
  items: {
    id: string;
    label: string;
    value: number;
    total?: number;
    suffix: string;
  }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.total ?? item.value));
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{item.label}</span>
            <b>
              {item.value}
              {item.suffix}
            </b>
          </div>
          <Progress value={(item.value / (item.total ?? max)) * 100} />
        </div>
      ))}
    </div>
  );
}
