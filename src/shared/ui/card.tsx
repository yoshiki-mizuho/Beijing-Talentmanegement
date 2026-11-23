import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--hub-radius-xl)] border border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] text-[var(--hub-color-text)] shadow-[var(--hub-shadow-sm)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-[var(--hub-space-5)] pb-[var(--hub-space-3)]", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-[length:var(--hub-text-sm)] font-semibold text-[var(--hub-color-text-heading)]", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-[length:var(--hub-text-sm)] text-[var(--hub-color-text-muted)]", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-[var(--hub-space-5)] pt-0", className)} {...props} />;
}
