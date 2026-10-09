"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode
} from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/shared/lib/action-result";
import {
  ConfirmDialog,
  type ConfirmDialogOptions
} from "@/shared/ui/confirm-dialog";
import { SubmitButton } from "@/shared/ui/submit-button";

type Action = (formData: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  confirm,
  onSuccess,
  ...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: Action;
  children: ReactNode;
  confirm?: ConfirmDialogOptions;
  onSuccess?: () => void;
}) {
  const onSuccessRef = useRef(onSuccess);
  const [, formAction] = useActionState<ActionResult | null, FormData>(
    async (_previousState, formData) => {
      const actionResult = await action(formData);

      if (actionResult.status === "success") {
        toast.success(actionResult.message);
        onSuccessRef.current?.();
      } else {
        toast.error(actionResult.message);
      }

      return actionResult;
    },
    null
  );
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ConfirmDialogOptions | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitterRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null);
  const bypassConfirmationRef = useRef(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (bypassConfirmationRef.current) {
      bypassConfirmationRef.current = false;
      return;
    }

    const submitter = event.nativeEvent instanceof SubmitEvent
      ? event.nativeEvent.submitter as HTMLButtonElement | HTMLInputElement | null
      : null;
    const buttonConfirm = getButtonConfirmation(submitter);
    const requestedConfirmation = buttonConfirm ?? confirm;

    if (!requestedConfirmation) return;

    event.preventDefault();
    submitterRef.current = submitter;
    setPendingConfirmation(requestedConfirmation);
  }

  function confirmSubmission() {
    const form = formRef.current;
    if (!form) return;

    setPendingConfirmation(null);
    bypassConfirmationRef.current = true;
    form.requestSubmit(submitterRef.current ?? undefined);
  }

  return (
    <>
      <form ref={formRef} action={formAction} onSubmit={handleSubmit} {...props}>
        {children}
      </form>
      {pendingConfirmation ? (
        <ConfirmDialog
          open
          {...pendingConfirmation}
          onClose={() => setPendingConfirmation(null)}
          onConfirm={confirmSubmission}
        />
      ) : null}
    </>
  );
}

export function ConfirmSubmitButton({
  confirm,
  ...props
}: ComponentProps<typeof SubmitButton> & { confirm: ConfirmDialogOptions }) {
  return (
    <SubmitButton
      data-confirm-title={confirm.title}
      data-confirm-description={confirm.description}
      data-confirm-label={confirm.confirmLabel}
      data-confirm-destructive={confirm.destructive ? "true" : undefined}
      {...props}
    />
  );
}

function getButtonConfirmation(
  submitter: HTMLButtonElement | HTMLInputElement | null
): ConfirmDialogOptions | null {
  if (!submitter?.dataset.confirmTitle) return null;

  return {
    title: submitter.dataset.confirmTitle,
    description: submitter.dataset.confirmDescription ?? "",
    confirmLabel: submitter.dataset.confirmLabel ?? "実行する",
    destructive: submitter.dataset.confirmDestructive === "true"
  };
}
