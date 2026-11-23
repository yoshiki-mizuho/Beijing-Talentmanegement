import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "default" | "small" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--hub-color-primary)] text-[var(--hub-color-text-on-primary)] shadow-[var(--hub-shadow-sm)] hover:bg-[var(--hub-color-primary-hover)] disabled:bg-[var(--hub-color-primary-disabled)]",
  secondary:
    "border border-[var(--hub-color-border-strong)] bg-[var(--hub-color-surface)] text-[var(--hub-color-text)] shadow-[var(--hub-shadow-sm)] hover:bg-[var(--hub-color-surface-subtle)] disabled:text-[var(--hub-color-text-placeholder)]",
  ghost:
    "text-[var(--hub-color-text-sub)] hover:bg-[var(--hub-color-surface-muted)] disabled:text-[var(--hub-color-text-placeholder)]",
  destructive:
    "bg-[var(--hub-color-danger)] text-[var(--hub-color-text-on-primary)] shadow-[var(--hub-shadow-sm)] hover:bg-[var(--hub-color-danger-hover)] disabled:bg-[var(--hub-color-danger-border-strong)]"
};

const sizes: Record<ButtonSize, string> = {
  default: "h-10 rounded-[var(--hub-radius-lg)] px-[var(--hub-space-4)] text-[length:var(--hub-text-sm)]",
  small: "h-8 rounded-[var(--hub-radius-md)] px-[var(--hub-space-3)] text-[length:var(--hub-text-xs)]",
  icon: "h-9 w-9 p-0"
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-[var(--hub-space-1-5)] rounded-[var(--hub-radius-lg)] font-medium transition-colors duration-[var(--hub-duration)] ease-[var(--hub-ease)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hub-color-focus)] disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
