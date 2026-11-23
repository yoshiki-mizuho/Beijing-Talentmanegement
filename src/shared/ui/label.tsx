import type { LabelHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-[length:var(--hub-text-xs)] font-medium text-[var(--hub-color-text)]", className)}
      {...props}
    />
  );
}
