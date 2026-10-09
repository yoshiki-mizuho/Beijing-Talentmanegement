import { badgePalette } from "@/modules/growth/domain/badge-art";
import type { MemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";

type DashboardBadge = MemberDashboardViewModel["badges"][number];

export function BadgeGrid({ badges }: { badges: DashboardBadge[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {badges.map((badge) => (
        <BadgeItem key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

function BadgeItem({ badge }: { badge: DashboardBadge }) {
  const earned = badge.earnedAt !== null;
  const earnedLabel = earned
    ? `${formatDate(badge.earnedAt!)}に獲得`
    : "まだ獲得していません";

  return (
    <div className="group relative flex min-w-0 flex-col items-center gap-2">
      <button
        type="button"
        aria-label={`${badge.name}、${badge.rarityLabel}、${earnedLabel}`}
        className={`grid h-16 w-16 place-items-center rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${earned ? "" : "border-dashed border-slate-400 bg-slate-100"}`}
        style={earned ? { borderColor: badge.frameColor, backgroundColor: badge.backgroundColor } : undefined}
      >
        <span
          className="grid h-12 w-12 grid-cols-12 grid-rows-12 overflow-hidden"
          aria-hidden="true"
        >
          {badge.art.flatMap((row, rowIndex) =>
            Array.from(row).map((pixel, columnIndex) => (
              <span
                key={`${rowIndex}-${columnIndex}`}
                className="h-1 w-1"
                style={{
                  backgroundColor:
                    pixel === "."
                      ? "transparent"
                      : earned
                        ? badgePalette[pixel]
                        : "#94A3B8"
                }}
              />
            ))
          )}
        </span>
      </button>
      <span className="max-w-full truncate text-center text-xs font-medium text-[var(--foreground)]">
        {badge.name}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 hidden w-56 -translate-x-1/2 rounded-lg bg-[var(--foreground)] p-3 text-left text-xs leading-5 text-white shadow-xl group-hover:block group-focus-within:block"
      >
        <strong className="block text-sm">{badge.name}</strong>
        <span className="block">レア度: {badge.rarityLabel}</span>
        <span className="block">条件: {badge.condition}</span>
        <span className="mt-1 block text-slate-200">{earnedLabel}</span>
      </span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
}
