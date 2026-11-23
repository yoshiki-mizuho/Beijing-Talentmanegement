export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="読み込み中">
      <div className="space-y-2 border-b border-[var(--border)] pb-5">
        <div className="hub-skeleton h-7 w-48 rounded-[var(--hub-radius-md)]" />
        <div className="hub-skeleton h-4 w-full max-w-xl rounded-[var(--hub-radius-md)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="hub-skeleton h-5 w-32 rounded-[var(--hub-radius-md)]" />
            <div className="hub-skeleton mt-5 h-20 rounded-[var(--hub-radius-md)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
