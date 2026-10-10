import { ChevronsUp } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { SectionHeading } from "./section-heading";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));

export function RecentLevelUps({ items }: { items: Profile["recent"] }) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="recent-heading"
    >
      <SectionHeading id="recent-heading" icon={ChevronsUp} title="最近のレベルアップ" />
      <ul className="mt-4 divide-y divide-[var(--border)]">
        {items.map((item) => (
          <li
            key={`${item.skillName}-${item.changedAt}`}
            className="flex items-center justify-between gap-4 py-3 text-sm"
          >
            <time className="text-xs text-[var(--muted-foreground)]">
              {formatDate(item.changedAt)}
            </time>
            <strong className="flex-1">{item.skillName}</strong>
            <span>
              {item.fromLevel === null ? "新規" : `Lv${item.fromLevel}`} → Lv{item.toLevel}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
