export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="読み込み中">
      <div className="space-y-2 border-b border-[var(--border)] pb-5">
        <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--muted)] motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-[var(--muted)] motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="h-5 w-32 animate-pulse rounded-md bg-[var(--muted)] motion-reduce:animate-none" />
            <div className="mt-5 h-20 animate-pulse rounded-md bg-[var(--surface-subtle)] motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
