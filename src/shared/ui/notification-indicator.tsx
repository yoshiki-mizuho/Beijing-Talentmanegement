import { Bell } from "lucide-react";
import Link from "next/link";

import { Tooltip } from "@/shared/ui/tooltip";

const MAX_VISIBLE_UNREAD_COUNT = 99;

export function formatUnreadNotificationCount(unreadCount: number) {
  const normalizedCount = Math.max(0, Math.floor(unreadCount));
  return normalizedCount > MAX_VISIBLE_UNREAD_COUNT
    ? String(MAX_VISIBLE_UNREAD_COUNT) + "+"
    : String(normalizedCount);
}

export function getNotificationAccessibleLabel(unreadCount: number) {
  const normalizedCount = Math.max(0, Math.floor(unreadCount));
  return normalizedCount === 0
    ? "通知を開く、未読通知はありません"
    : "通知を開く、未読通知" + normalizedCount + "件";
}

export function NotificationIndicator({ unreadCount }: { unreadCount: number }) {
  const normalizedCount = Math.max(0, Math.floor(unreadCount));
  const accessibleLabel = getNotificationAccessibleLabel(normalizedCount);

  return (
    <Tooltip content={accessibleLabel}>
      <Link
        href="/notifications"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label={accessibleLabel}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {normalizedCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
          >
            {formatUnreadNotificationCount(normalizedCount)}
          </span>
        ) : null}
      </Link>
    </Tooltip>
  );
}
