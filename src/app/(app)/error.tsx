"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error", error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="space-y-4 p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            問題が発生しました
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            画面を表示できませんでした。もう一度お試しください。
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>再試行</Button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
