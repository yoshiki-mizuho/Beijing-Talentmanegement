"use client";

import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode
} from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  className,
  closeOnBackdrop = true
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector)
      );
      const currentIndex = focusable.indexOf(
        document.activeElement as HTMLElement
      );
      const nextIndex = getTrappedFocusIndex(
        currentIndex,
        focusable.length,
        event.shiftKey ? "backward" : "forward"
      );

      if (nextIndex >= 0) {
        event.preventDefault();
        focusable[nextIndex]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (closeOnBackdrop && event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 sm:p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:max-h-[calc(100dvh-2rem)]",
          className
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="break-words text-lg font-semibold text-[var(--foreground)]"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]"
              >
                {description}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={onClose}
            aria-label="ダイアログを閉じる"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-6 sm:py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function getTrappedFocusIndex(
  currentIndex: number,
  focusableCount: number,
  direction: "forward" | "backward"
) {
  if (focusableCount <= 0) return -1;

  if (direction === "backward") {
    return currentIndex <= 0 ? focusableCount - 1 : currentIndex - 1;
  }

  return currentIndex < 0 || currentIndex >= focusableCount - 1
    ? 0
    : currentIndex + 1;
}
