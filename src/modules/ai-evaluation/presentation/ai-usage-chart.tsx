"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartColors } from "@/shared/ui/chart-colors";

export function AiUsageChart({
  data,
}: {
  data: Array<{
    day: number;
    SUCCESS: number;
    FALLBACK: number;
    FAILED: number;
  }>;
}) {
  return (
    <div className="h-72" aria-label="日ごとの実行回数">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={(day) => `${day}日`} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(day) => `${day}日`} />
          <Bar
            dataKey="SUCCESS"
            name="AI"
            stackId="usage"
            fill={chartColors.teal}
          />
          <Bar
            dataKey="FALLBACK"
            name="簡易版"
            stackId="usage"
            fill={chartColors.amber}
          />
          <Bar
            dataKey="FAILED"
            name="失敗"
            stackId="usage"
            fill={chartColors.coral}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
