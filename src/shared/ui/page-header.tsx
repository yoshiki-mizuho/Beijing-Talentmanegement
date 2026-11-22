import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[var(--hub-space-4)] pb-[var(--hub-space-6)] sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase text-[var(--primary)]">{eyebrow}</p>
        ) : null}
        <h1 className="text-[length:var(--hub-text-2xl)] font-bold leading-[var(--hub-leading-2xl)] tracking-[var(--hub-tracking-tight)] text-[var(--hub-color-text-heading)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
