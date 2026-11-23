"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "送信中…",
  disabled,
  className,
  name,
  value,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending, data } = useFormStatus();
  const isCurrentSubmission = pending && (
    !name || data?.get(name) === String(value ?? "")
  );

  return (
    <Button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      className={cn("min-h-11", className)}
      {...props}
    >
      {isCurrentSubmission ? (
        <>
          <span
            className="h-3 w-3 animate-[spin_var(--hub-spinner-duration)_linear_infinite] rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
            aria-hidden="true"
          />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
