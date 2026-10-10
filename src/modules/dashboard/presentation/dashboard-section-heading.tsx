import type { LucideIcon } from "lucide-react";

export function DashboardSectionHeading({
  id,
  icon: Icon,
  title,
  description
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <h2 id={id} className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
    </div>
  );
}
