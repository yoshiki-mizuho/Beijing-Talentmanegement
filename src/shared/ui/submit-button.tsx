"use client";

import { LoaderCircle } from "lucide-react";
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
          <LoaderCircle
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
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
