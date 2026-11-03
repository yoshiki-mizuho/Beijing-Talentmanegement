import Link from "next/link";
import type { Route } from "next";
import { Lock } from "lucide-react";
import { DashboardVisualizations } from "./dashboard-visualizations";
import type { getDashboardSummary } from "../application/dashboard-service";

type Model = Awaited<ReturnType<typeof getDashboardSummary>>;
const momentum = {
  accelerating: { label: "加速", icon: "▲", color: "text-[var(--primary)]" },
  steady: {
    label: "横ばい",
    icon: "▶",
    color: "text-[var(--muted-foreground)]",
  },
  slowing: { label: "鈍化", icon: "▼", color: "text-amber-800" },
} as const;

export function OrganizationDashboard({ model }: { model: Model }) {
  const state = momentum[model.metrics.momentum];
  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="self-start overflow-x-auto rounded-2xl border border-[var(--border)] bg-white p-3 lg:sticky lg:top-4">
        <h2 className="px-2 pb-2 text-sm font-bold">部署</h2>
        <nav aria-label="部署の階層" className="min-w-56 space-y-1">
          {model.showCompany ? (
            <Link
              href="/dashboard?view=organization"
              aria-current={
                model.scope.departmentId === null ? "page" : undefined
              }
              className={`flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold ${model.scope.departmentId === null ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--muted)]"}`}
            >
              全社
              <span className="ml-auto text-xs">
                {model.scope.departmentId === null
                  ? model.scope.memberCount
                  : ""}
                {model.scope.departmentId === null ? "名" : ""}
              </span>
            </Link>
          ) : null}
          {model.tree.map((item) =>
            item.visible ? (
              <Link
                key={item.id}
                href={
                  `/dashboard?view=organization&department=${item.id}` as Route
                }
                aria-current={
                  item.id === model.scope.departmentId ? "page" : undefined
                }
                className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm ${item.id === model.scope.departmentId ? "bg-[var(--primary)] font-semibold text-white" : "hover:bg-[var(--muted)]"}`}
                style={{ paddingLeft: `${8 + item.depth * 16}px` }}
              >
                <span className="truncate">{item.name}</span>
                {item.own ? (
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-[var(--primary)]">
                    自分
                  </span>
                ) : null}
                <span className="ml-auto text-xs">{item.memberCount}名</span>
              </Link>
            ) : (
              <div
                key={item.id}
                className="flex min-h-11 items-center gap-2 px-2 text-sm text-[var(--muted-foreground)]"
                style={{ paddingLeft: `${8 + item.depth * 16}px` }}
              >
                <span>{item.name}</span>
                <Lock size={14} aria-label="見られません" />
              </div>
            ),
          )}
        </nav>
      </aside>
      <main className="min-w-0 space-y-5">
        <header>
          <p className="text-xs text-[var(--muted-foreground)]">
            {model.scope.pathLabel}
          </p>
          <h1 className="text-[26px] font-bold">
            {model.scope.name}{" "}
            <span className="text-base font-medium text-[var(--muted-foreground)]">
              {model.scope.memberCount}名
            </span>
          </h1>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="成長の勢い"
            value={`${state.icon} ${state.label}`}
            tone={state.color}
            note={
              model.metrics.ratio === null
                ? "前の3か月は0回"
                : `直近3か月は前の3か月の ${model.metrics.ratio}%`
            }
          />
          <Metric
            title="1人あたりのレベルアップ"
            value={
              model.metrics.perPerson === null
                ? "—"
                : `${model.metrics.perPerson.toFixed(2)} 回/月`
            }
            note="直近3か月の平均"
          />
          <Metric
            title="ロール達成者"
            value={`${model.metrics.achievedCount}名`}
            note={`1年前は ${model.metrics.achievedYearAgo}名`}
          />
          <Metric
            title="目標ロールへの平均進捗"
            value={
              model.metrics.averageProgress === null
                ? "—"
                : `${model.metrics.averageProgress}%`
            }
            note={
              model.metrics.progressThreeMonthsAgo === null
                ? "3か月前は —"
                : `3か月前は ${model.metrics.progressThreeMonthsAgo}%`
            }
          />
        </section>
        <div className="grid gap-5 xl:grid-cols-2">
          <MonthlyChart name={model.scope.name} metrics={model.metrics} />
          <CategoryChart metrics={model.metrics} />
        </div>
        {model.comparisons.length > 1 ? <Comparisons model={model} /> : null}
        <DashboardVisualizations
          summary={model.summary}
          showDepartments={false}
          compact
        />
      </main>
    </div>
  );
}

function Metric({
  title,
  value,
  note,
  tone = "",
}: {
  title: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">{note}</p>
    </article>
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
      <h2 className="mb-4 font-bold">{title}</h2>
      {children}
    </section>
  );
}

function MonthlyChart({
  name,
  metrics,
}: {
  name: string;
  metrics: Model["metrics"];
}) {
  const max = Math.max(1, ...metrics.monthly.map((item) => item.count));
  const points = metrics.monthly
    .map((_, i) => {
      const values = metrics.monthly.slice(Math.max(0, i - 2), i + 1);
      const avg = values.reduce((s, x) => s + x.count, 0) / values.length;
      return `${32 + i * 38},${160 - (avg / max) * 110}`;
    })
    .join(" ");
  return (
    <Panel title="月ごとのレベルアップ">
      <svg
        role="img"
        aria-label={`${name}の月ごとのレベルアップ。勢いは${momentum[metrics.momentum].label}`}
        viewBox="0 0 480 200"
        className="w-full"
      >
        <rect x="366" y="15" width="110" height="150" rx="8" fill="#E6F4F1" />
        <text x="371" y="31" fontSize="12" fill="#115E59">
          直近3か月
        </text>
        <text x="16" y="54" textAnchor="end" fontSize="11" fill="#5B6B6A">
          {max}
        </text>
        <text x="16" y="109" textAnchor="end" fontSize="11" fill="#5B6B6A">
          {Math.round((max / 2) * 10) / 10}
        </text>
        {metrics.monthly.map((item, i) => (
          <g key={`${item.label}-${i}`}>
            <rect
              x={22 + i * 38}
              y={160 - (item.count / max) * 110}
              width="20"
              height={Math.max(2, (item.count / max) * 110)}
              rx="2"
              fill="#0F766E"
            />
            <text
              x={32 + i * 38}
              y="182"
              textAnchor="middle"
              fontSize="11"
              fill="#5B6B6A"
            >
              {item.label}
            </text>
          </g>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#D97706"
          strokeWidth="3"
        />
        <line x1="20" y1="105" x2="470" y2="105" stroke="#E3E8E6" />
        <line x1="20" y1="50" x2="470" y2="50" stroke="#E3E8E6" />
      </svg>
    </Panel>
  );
}
function CategoryChart({ metrics }: { metrics: Model["metrics"] }) {
  const colors = ["#115E59", "#0F766E", "#2A9188", "#65B8B0", "#D97706"];
  const totals = metrics.categories.series.map((row) =>
    Object.values(row).reduce((a, b) => a + b, 0),
  );
  const max = Math.max(1, ...totals);
  if (!metrics.categories.categories.length)
    return (
      <Panel title="どの分野に積み上がったか">
        <p className="py-20 text-center text-sm text-[var(--muted-foreground)]">
          まだレベルアップがありません
        </p>
      </Panel>
    );
  return (
    <Panel title="どの分野に積み上がったか">
      <svg
        role="img"
        aria-label="カテゴリ別の累積レベルアップ"
        viewBox="0 0 480 200"
        className="w-full"
      >
        {metrics.categories.categories.map((category, ci) => {
          const boundary = (row: Record<string, number>, include: boolean) =>
            metrics.categories.categories
              .slice(0, ci + (include ? 1 : 0))
              .reduce((sum, name) => sum + (row[name] ?? 0), 0);
          const upper = metrics.categories.series.map(
            (row, i) =>
              `${25 + i * 38},${165 - (boundary(row, true) / max) * 130}`,
          );
          const lower = metrics.categories.series
            .map(
              (row, i) =>
                `${25 + i * 38},${165 - (boundary(row, false) / max) * 130}`,
            )
            .reverse();
          return (
            <polygon
              key={category}
              points={[...upper, ...lower].join(" ")}
              fill={colors[ci]}
              opacity="0.9"
            />
          );
        })}
        <line x1="20" y1="165" x2="465" y2="165" stroke="#E3E8E6" />
        <text x="25" y="185" fontSize="11" fill="#5B6B6A">
          {metrics.monthly[0]?.label}
        </text>
        <text x="443" y="185" textAnchor="end" fontSize="11" fill="#5B6B6A">
          {metrics.monthly.at(-1)?.label}
        </text>
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {metrics.categories.categories.map((name, i) => (
          <li key={name} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: colors[i] }}
              aria-hidden="true"
            />
            {name}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
function Comparisons({ model }: { model: Model }) {
  return (
    <Panel
      title={
        model.comparisonMode === "children"
          ? "配下の部署を比べる"
          : "並列の部署と比べる"
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
        <p>人数の差が出ないよう、1人あたりの回数で比べます。</p>
        <p>▲ 加速　▶ 横ばい　▼ 鈍化</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {model.comparisons.map((item) => {
          const state = momentum[item.momentum];
          const max = Math.max(1, ...item.monthly.map((x) => x.count));
          return (
            <Link
              key={item.id}
              href={
                `/dashboard?view=organization&department=${item.id}` as Route
              }
              className={`rounded-xl border bg-white p-4 ${item.id === model.scope.departmentId ? "border-2 border-[var(--primary)]" : "border-[var(--border)]"}`}
            >
              <div className="flex justify-between">
                <b>{item.name}</b>
                <span className={state.color}>
                  {state.icon}
                  {state.label}
                </span>
              </div>
              <svg
                role="img"
                aria-label={`${item.name}の12か月の推移`}
                viewBox="0 0 220 50"
                className="my-2 w-full"
              >
                <polyline
                  points={item.monthly
                    .map((x, i) => `${5 + i * 19},${45 - (x.count / max) * 38}`)
                    .join(" ")}
                  fill="none"
                  stroke={
                    item.momentum === "slowing"
                      ? "#92400E"
                      : item.momentum === "accelerating"
                        ? "#0F766E"
                        : "#5B6B6A"
                  }
                  strokeWidth="2"
                />
              </svg>
              <p className="text-xs text-[var(--muted-foreground)]">
                {item.memberCount}名　1人あたり{" "}
                {item.perPerson?.toFixed(2) ?? "—"} 回/月
              </p>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
