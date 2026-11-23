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
  headerActions,
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
  headerActions?: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
        onCloseRef.current();
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
  }, [open]);

  if (!open) return null;

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (closeOnBackdrop && event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[var(--hub-z-modal)] flex items-start justify-center bg-[var(--hub-color-overlay)] p-2 pt-[var(--hub-space-6)] sm:px-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "max-h-[calc(100dvh-var(--hub-space-6)-0.5rem)] w-full max-w-lg overflow-y-auto rounded-[var(--hub-radius-2xl)] bg-[var(--hub-color-surface)] shadow-[var(--hub-shadow-xl)]",
          className
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] px-[var(--hub-space-5)] py-[var(--hub-space-3)]">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-semibold text-[var(--hub-color-text-muted)]">
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="break-words text-[length:var(--hub-text-base)] font-semibold text-[var(--hub-color-text-heading)]"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-[length:var(--hub-text-sm)] text-[var(--hub-color-text-sub)]"
              >
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
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
          </div>
        </header>
        <div className="p-[var(--hub-space-5)]">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-[var(--hub-space-2)] border-t border-[var(--hub-color-border)] px-[var(--hub-space-5)] py-[var(--hub-space-3)]">
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
