"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";

import { confirmNotificationAction } from "@/modules/notifications/presentation/actions";
import { ActionForm } from "@/shared/ui/action-form";
import { SubmitButton } from "@/shared/ui/submit-button";

export function NotificationConfirmForm({
  id,
  destination,
  unread,
  children
}: {
  id: string;
  destination: string;
  unread: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <ActionForm
      action={confirmNotificationAction}
      className="grid gap-3 rounded-md border border-[var(--border)] p-4 md:grid-cols-[1fr_auto] md:items-center"
      onSuccess={() => {
        router.push(destination as Route);
        router.refresh();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {children}
      <SubmitButton
        pendingLabel="確認中…"
        variant={unread ? "primary" : "secondary"}
      >
        確認
      </SubmitButton>
    </ActionForm>
  );
}
