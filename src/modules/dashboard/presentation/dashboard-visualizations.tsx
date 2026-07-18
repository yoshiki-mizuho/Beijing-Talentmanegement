"use client";

import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";

import type { DashboardViewModel } from "@/modules/dashboard/presentation/dashboard-view-model";
import { Badge } from "@/shared/ui/badge";
import { chartColors, chartSeries } from "@/shared/ui/chart-colors";
import { ChartPanel } from "@/shared/ui/chart-panel";
import { EmptyState } from "@/shared/ui/empty-state";

export function DashboardVisualizations({
  roles,
  categories
}: Pick<DashboardViewModel, "roles" | "categories">) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <ChartPanel
        title="ロール充足率"
        description="全メンバーに対するロール要件達成者の割合"
        accessory={<Badge variant="primary">{roles.length}ロール</Badge>}
      >
        {roles.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="表示できるロールがありません"
            description="有効なロールと必要スキルを設定すると、ここに充足率が表示されます。"
          />
        ) : (
          <div role="img" aria-label={roleChartSummary(roles)}>
            <div className="h-72 min-w-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roles} layout="vertical" margin={{ top: 4, right: 24, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke={chartColors.muted} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={104}
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "#eef3f1" }}
                    formatter={(value) => [`${Number(value)}%`, "達成率"]}
                  />
                  <Bar
                    dataKey="rate"
                    fill={chartColors.teal}
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                    isAnimationActive={false}
                    background={{ fill: "#eef3f1" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-[var(--muted-foreground)]">{role.name}</span>
                  <span className="shrink-0 font-semibold text-[var(--foreground)]">
                    {role.achievedMembers}人 / {role.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartPanel>

      <ChartPanel
        title="スキルカテゴリ構成"
        description="登録されているスキルのカテゴリ別内訳"
        accessory={<Badge>{categories.reduce((total, item) => total + item.value, 0)}スキル</Badge>}
      >
        {categories.length === 0 ? (
          <EmptyState
            icon={PieChartIcon}
            title="表示できるカテゴリがありません"
            description="スキルカテゴリを登録すると、ここに構成比が表示されます。"
          />
        ) : (
          <div role="img" aria-label={categoryChartSummary(categories)}>
            <div className="h-56 min-w-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {categories.map((category, index) => (
                      <Cell key={category.id} fill={chartSeries[index % chartSeries.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [`${Number(value)}件`, "スキル数"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 border-t border-[var(--border)] pt-4">
              {categories.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: chartSeries[index % chartSeries.length] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[var(--muted-foreground)]">{category.name}</span>
                  <span className="font-semibold text-[var(--foreground)]">{category.value}件</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartPanel>
    </div>
  );
}

function roleChartSummary(roles: DashboardViewModel["roles"]) {
  return roles.map((role) => `${role.name}: 達成率${role.rate}%`).join("、");
}

function categoryChartSummary(categories: DashboardViewModel["categories"]) {
  return categories.map((category) => `${category.name}: ${category.value}件`).join("、");
}