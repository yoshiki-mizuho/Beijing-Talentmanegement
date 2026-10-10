import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      {Icon ? <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--primary)]"><Icon className="h-5 w-5" aria-hidden="true" /></span> : null}
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p> : null}
    </div>
  );
}
