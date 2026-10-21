"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { changePasswordAction } from "@/modules/auth/presentation/password-actions";
import { ActionForm } from "@/shared/ui/action-form";
import { FormField } from "@/shared/ui/form-field";
import { SubmitButton } from "@/shared/ui/submit-button";

export function PasswordForm({ initialChange }: { initialChange: boolean }) {
  const router = useRouter();

  return (
    <ActionForm
      action={changePasswordAction}
      className="grid gap-4"
      onSuccess={() => {
        router.replace("/dashboard");
        router.refresh();
      }}
    >
      {!initialChange ? <FormField
        id="current-password"
        label="現在のパスワード"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
      /> : null}
      <FormField
        id="new-password"
        label="新しいパスワード"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormField
        id="confirm-password"
        label={initialChange ? "もう一度入力" : "新しいパスワード確認"}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <SubmitButton pendingLabel={initialChange ? "設定中…" : "変更中…"}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {initialChange ? "決めて始める" : "変更する"}
      </SubmitButton>
    </ActionForm>
  );
}
