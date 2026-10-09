import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          ページが見つかりません
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          URLをご確認いただくか、ダッシュボードから目的の画面へ移動してください。
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        >
          ダッシュボードへ戻る
        </Link>
      </div>
    </main>
  );
}
