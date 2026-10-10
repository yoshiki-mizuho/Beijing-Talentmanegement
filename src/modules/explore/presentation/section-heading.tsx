import type { LucideIcon } from "lucide-react";

export function SectionHeading({
  id,
  icon: Icon,
  title
}: {
  id: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
    </div>
  );
}
