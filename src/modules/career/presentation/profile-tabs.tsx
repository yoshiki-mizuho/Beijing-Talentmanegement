import Link from "next/link";

export function ProfileTabs({
  memberId,
  activeTab
}: {
  memberId: string;
  activeTab?: string;
}) {
  return (
    <nav
      className="flex border-b border-[var(--border)]"
      aria-label="プロフィールの表示切り替え"
    >
      <Link
        className={`px-4 py-3 text-sm font-semibold ${
          activeTab !== "career"
            ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
            : "text-[var(--muted-foreground)]"
        }`}
        href={`/people/${memberId}`}
      >
        スキル
      </Link>
      <Link
        className={`px-4 py-3 text-sm font-semibold ${
          activeTab === "career"
            ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
            : "text-[var(--muted-foreground)]"
        }`}
        href={`/people/${memberId}?tab=career`}
      >
        経歴・資格
      </Link>
    </nav>
  );
}
