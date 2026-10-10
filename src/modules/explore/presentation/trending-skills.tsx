import { TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { getExploreData } from "@/modules/explore/application/explore-service";
import { SectionHeading } from "./section-heading";

type Data = Awaited<ReturnType<typeof getExploreData>>;

export function TrendingSkills({ items, level }: { items: Data["trending"]; level: number }) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="trending-heading"
    >
      <SectionHeading id="trending-heading" icon={TrendingUp} title="いま伸びている技術" />
      <div className="mt-4 divide-y divide-[var(--border)]">
        {items.map((item) => (
          <Link
            key={item.skillId}
            href={
              `/explore?skill=${encodeURIComponent(item.skillId)}&level=${level}#people-search` as Route
            }
            className="flex min-h-14 items-center justify-between gap-3 px-2 hover:bg-[var(--surface-subtle)]"
          >
            <span>
              <strong className="block text-sm">{item.skillName}</strong>
              <span className="text-xs text-[var(--muted-foreground)]">{item.categoryName}</span>
            </span>
            <span className="font-bold text-[var(--primary)]">{item.count}件</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
