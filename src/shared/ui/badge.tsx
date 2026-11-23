import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--hub-color-neutral-bg)] text-[var(--hub-color-neutral-text)]",
  primary: "bg-[var(--hub-color-selected-bg)] text-[var(--hub-color-selected-text)]",
  success: "bg-[var(--hub-color-success-bg)] text-[var(--hub-color-success-text)]",
  warning: "bg-[var(--hub-color-warning-bg)] text-[var(--hub-color-warning-text)]",
  danger: "bg-[var(--hub-color-danger-bg)] text-[var(--hub-color-danger-text)]",
  info: "bg-[var(--hub-color-info-bg)] text-[var(--hub-color-info-text)]"
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--hub-radius-sm)] px-[var(--hub-space-2)] py-[var(--hub-space-0-5)] text-[length:var(--hub-text-xs)] font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
