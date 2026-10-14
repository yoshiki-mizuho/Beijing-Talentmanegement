"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { buildGrowthCalendar, getGrowthCalendarDayKind } from "@/modules/growth/domain/growth-insights";
import { cn } from "@/shared/lib/utils";
import type { MemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

export function GrowthCalendar({
  calendar
}: {
  calendar: MemberDashboardViewModel["calendar"];
}) {
  const [visible, setVisible] = useState({
    year: calendar.initialYear,
    month: calendar.initialMonth
  });
  const days = useMemo(
    () =>
      buildGrowthCalendar({
        year: visible.year,
        month: visible.month,
        assessmentDates: calendar.assessmentDates,
        levelChanges: calendar.levelChanges
      }),
    [calendar, visible]
  );

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(visible.year, visible.month + offset, 1));
    setVisible({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="前月を表示"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {visible.year}年{visible.month + 1}月
        </p>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="翌月を表示"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-xs text-[var(--muted-foreground)]">
        {weekdayLabels.map((label) => <span key={label} className="py-1">{label}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${visible.year}年${visible.month + 1}月の成長カレンダー`}>
        {days.map((day, index) => {
          const kind = getGrowthCalendarDayKind(day);
          const contents = [
            day.levelUpCount > 0 ? "レベルアップ" : null,
            day.assessmentCount > 0 ? "申請" : null
          ].filter(Boolean).join("、");
          const label = day.day === null
            ? ""
            : `${visible.month + 1}月${day.day}日${contents ? ` ${contents}` : ""}`;
          return (
            <div
              key={day.dateKey ?? `blank-${index}`}
              role="gridcell"
              aria-label={label || undefined}
              className={cn(
                "grid h-7 place-items-center rounded-md text-[11px]",
                day.day !== null && "border border-[var(--border)]",
                kind === "assessment" && "border-teal-200 bg-teal-100 text-teal-950",
                kind === "level-up" && "border-[var(--primary)] bg-[var(--primary)] font-semibold text-white"
              )}
            >
              {day.day}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded border border-teal-200 bg-teal-100" />申請した日</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded border border-[var(--primary)] bg-[var(--primary)]" />レベルアップした日</span>
      </div>
    </div>
  );
}
