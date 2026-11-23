import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex w-full">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-[var(--hub-radius-lg)] border border-[var(--hub-color-border-strong)] bg-[var(--hub-color-surface)] px-[var(--hub-space-4)] py-[var(--hub-space-2-5)] pr-9 text-[length:var(--hub-text-sm)] text-[var(--hub-color-text-heading)] shadow-[var(--hub-shadow-sm)] outline-none transition-colors focus:border-[var(--hub-color-focus)] focus:ring-1 focus:ring-[var(--hub-color-focus)] aria-invalid:border-[var(--hub-color-danger)] disabled:cursor-not-allowed disabled:bg-[var(--hub-color-surface-subtle)]",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--hub-color-text-muted)]"
        aria-hidden="true"
      />
    </span>
  );
}
