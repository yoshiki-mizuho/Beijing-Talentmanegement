import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const tones = {
  teal: "bg-teal-50 text-teal-800",
  coral: "bg-red-50 text-[var(--accent-coral)]",
  amber: "bg-amber-50 text-amber-800",
  green: "bg-emerald-50 text-emerald-800"
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
    <div className="flex min-h-32 flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">{label}</p>
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md", tones[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className="text-3xl font-semibold text-[var(--foreground)]">{value.toLocaleString("ja-JP")}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{caption}</p>
      </div>
    </div>
  );
}