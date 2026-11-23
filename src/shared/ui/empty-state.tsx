import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--hub-radius-xl)] border border-dashed border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] px-6 py-[var(--hub-space-12)] text-center">
      {Icon ? <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--hub-color-surface-subtle)] text-[var(--hub-color-text-muted)]"><Icon className="h-5 w-5" aria-hidden="true" /></span> : null}
      <p className="text-[length:var(--hub-text-sm)] font-semibold text-[var(--hub-color-text)]">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[length:var(--hub-text-sm)] text-[var(--hub-color-text-muted)]">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
