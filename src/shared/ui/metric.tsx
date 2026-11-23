import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const tones = {
  teal: "bg-[var(--hub-color-selected-bg)] text-[var(--hub-color-selected-text)]",
  coral: "bg-[var(--hub-color-danger-bg)] text-[var(--hub-color-danger-text)]",
  amber: "bg-[var(--hub-color-warning-bg)] text-[var(--hub-color-warning-text)]",
  green: "bg-[var(--hub-color-success-bg)] text-[var(--hub-color-success-text)]"
} as const;

export function Metric({
  label,
  value,
  caption,
  icon: Icon,
  tone = "teal"
}: {
  label: string;
  value: number;
  caption: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="flex min-h-32 flex-col justify-between rounded-[var(--hub-radius-xl)] border border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] p-[var(--hub-space-4)] shadow-[var(--hub-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[length:var(--hub-text-xs)] font-medium text-[var(--hub-color-text-muted)]">{label}</p>
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md", tones[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className="text-[length:var(--hub-text-2xl)] font-bold text-[var(--hub-color-text-heading)]">{value.toLocaleString("ja-JP")}</p>
        <p className="mt-1 text-[length:var(--hub-text-xs)] text-[var(--hub-color-text-muted)]">{caption}</p>
      </div>
    </div>
  );
}
