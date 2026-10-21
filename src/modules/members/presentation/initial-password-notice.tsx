"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";

// 初回ログイン用のパスワードを一度だけ見せる。値は画面の状態にだけ持ち、保存しない。
export function InitialPasswordNotice({
  email,
  initialPassword,
}: {
  email: string;
  initialPassword: string;
}) {
  async function copy() {
    const text = [
      `ログインURL: ${window.location.origin}/login`,
      `メールアドレス: ${email}`,
      `パスワード: ${initialPassword}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("コピーしました。");
    } catch {
      toast.error(
        "コピーできませんでした。パスワードを選んでコピーしてください。",
      );
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted-foreground)]">
        次の初回ログイン用のパスワードを本人に伝えてください。この画面を閉じると、もう表示できません。
      </p>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
        <p
          className="flex-1 font-mono text-lg font-semibold tracking-wider"
          aria-label="初回ログイン用のパスワード"
        >
          {initialPassword}
        </p>
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          コピー
        </Button>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        ログインの URL とメールアドレス（{email}）も一緒にコピーされます。
      </p>
    </div>
  );
}
