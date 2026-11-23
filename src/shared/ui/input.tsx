import type { InputHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 rounded-[var(--hub-radius-md)] border border-[var(--hub-color-border-strong)] bg-[var(--hub-color-surface)] px-[var(--hub-space-3)] text-[length:var(--hub-text-sm)] text-[var(--hub-color-text-heading)] shadow-[var(--hub-shadow-sm)] outline-none transition-colors placeholder:text-[var(--hub-color-text-placeholder)] focus:border-[var(--hub-color-focus)] focus:ring-1 focus:ring-[var(--hub-color-focus)] aria-invalid:border-[var(--hub-color-danger)] disabled:cursor-not-allowed disabled:bg-[var(--hub-color-surface-subtle)] disabled:text-[var(--hub-color-text-muted)]",
        className
      )}
      {...props}
    />
  );
}
