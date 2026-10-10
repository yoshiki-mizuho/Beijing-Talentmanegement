"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SubmitButton } from "@/shared/ui/submit-button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? "メールアドレスまたはパスワードが正しくありません。" : null
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl: "/dashboard"
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <h1 className="mb-2 text-[26px] font-bold text-[var(--foreground)]">
        ログイン
      </h1>
      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <Label
          htmlFor="login-email"
          className="text-[13px] font-bold text-[var(--foreground)]/85"
        >
          メールアドレス
        </Label>
        <Input
          id="login-email"
          className="h-[46px] w-full rounded-[10px] text-[15px]"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label
          htmlFor="login-password"
          className="text-[13px] font-bold text-[var(--foreground)]/85"
        >
          パスワード
        </Label>
        <div className="relative">
          <Input
            id="login-password"
            className="h-[46px] w-full rounded-[10px] pr-12 text-[15px]"
            name="password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="absolute right-1 top-1 grid h-[38px] w-10 place-items-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={isPasswordVisible ? "パスワードを隠す" : "パスワードを表示"}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
          >
            {isPasswordVisible ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <SubmitButton
        className="h-12 w-full rounded-[10px] text-[15px]"
        pendingLabel="ログイン中…"
        disabled={isSubmitting}
      >
        <LogIn className="h-[18px] w-[18px]" aria-hidden="true" />
        {isSubmitting ? "ログイン中" : "ログイン"}
      </SubmitButton>
    </form>
  );
}
