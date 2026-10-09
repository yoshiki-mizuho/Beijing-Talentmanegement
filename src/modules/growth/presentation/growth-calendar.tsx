"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { buildGrowthCalendar } from "@/modules/growth/domain/growth-insights";
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
          const label = day.day === null
            ? ""
            : `${visible.month + 1}月${day.day}日、申請${day.assessmentCount}件、レベルアップ${day.levelUpCount}件`;
          return (
            <div
              key={day.dateKey ?? `blank-${index}`}
              role="gridcell"
              aria-label={label || undefined}
              className={`relative grid aspect-square min-h-10 place-items-center rounded-md text-xs ${day.day === null ? "" : "border border-[var(--border)]"}`}
            >
              {day.day}
              {day.assessmentCount > 0 ? (
                <span className="absolute bottom-1 left-1 h-2 w-2 rounded-full bg-teal-200" aria-hidden="true" />
              ) : null}
              {day.levelUpCount > 0 ? (
                <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-200" />申請した日</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />レベルアップした日</span>
      </div>
    </div>
  );
}
