import type { ReactNode } from "react";

export function ChartPanel({
  title,
  description,
  accessory,
  children,
  className = ""
}: {
  title: string;
  description?: string;
  accessory?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] ${className}`}>
      <div className="flex min-h-16 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
          ) : null}
        </div>
        {accessory ? <div className="shrink-0">{accessory}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}