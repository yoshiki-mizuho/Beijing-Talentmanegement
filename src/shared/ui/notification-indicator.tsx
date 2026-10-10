"use client";

import type { Notification } from "@prisma/client";
import { Bell } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  confirmNotificationAction,
  markAllNotificationsReadAction
} from "@/modules/notifications/presentation/actions";
import { formatNotificationDate } from "@/modules/notifications/presentation/notification-date";
import { getNotificationDestination } from "@/modules/notifications/presentation/notification-destination";
import type { AppRole } from "@/shared/auth/app-access";
import { ActionForm } from "@/shared/ui/action-form";
import { EmptyState } from "@/shared/ui/empty-state";
import { SubmitButton } from "@/shared/ui/submit-button";

const MAX_VISIBLE_UNREAD_COUNT = 99;
const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 300;

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

export function NotificationIndicator({
  unreadCount,
  notifications,
  role
}: {
  unreadCount: number;
  notifications: Notification[];
  role: AppRole;
}) {
  const normalizedCount = Math.max(0, Math.floor(unreadCount));
  const accessibleLabel = getNotificationAccessibleLabel(normalizedCount);
  const detailsRef = useDismissibleNotificationDetails();
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function clearTimers() {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }

  function scheduleOpen() {
    clearTimers();
    openTimerRef.current = setTimeout(() => {
      if (detailsRef.current) detailsRef.current.open = true;
    }, OPEN_DELAY_MS);
  }

  function scheduleClose() {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      if (detailsRef.current) detailsRef.current.open = false;
    }, CLOSE_DELAY_MS);
  }

  useEffect(() => clearTimers, []);

  return (
    <details
      ref={detailsRef}
      className="group relative"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <summary
        className="relative inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] [&::-webkit-details-marker]:hidden"
        aria-label={accessibleLabel}
        onClick={clearTimers}
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
      </summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
        {notifications.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {notifications.map((notification) => (
              <NotificationPopoverItem
                key={notification.id}
                notification={notification}
                role={role}
              />
            ))}
          </div>
        ) : (
          <div className="[&>div]:min-h-32">
            <EmptyState title="未読の通知はありません" />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] p-2">
          <Link
            href="/notifications"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            すべて見る
          </Link>
          <ActionForm action={markAllNotificationsReadAction}>
            <SubmitButton
              variant="secondary"
              pendingLabel="既読にしています…"
              disabled={normalizedCount === 0}
              className="px-3"
            >
              すべて既読にする
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </details>
  );
}

function NotificationPopoverItem({
  notification,
  role
}: {
  notification: Notification;
  role: AppRole;
}) {
  const router = useRouter();
  const destination = getNotificationDestination({
    type: notification.type,
    role,
    skillSelfAssessmentId: notification.skillSelfAssessmentId
  }) ?? "/notifications";

  return (
    <ActionForm
      action={confirmNotificationAction}
      onSuccess={() => {
        router.push(destination as Route);
        router.refresh();
      }}
    >
      <input type="hidden" name="id" value={notification.id} />
      <SubmitButton
        variant="ghost"
        pendingLabel="確認中…"
        className="h-auto min-h-16 w-full items-start justify-between rounded-none px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate">{notification.title}</span>
        <time
          dateTime={notification.createdAt.toISOString()}
          className="shrink-0 text-xs font-normal text-[var(--muted-foreground)]"
        >
          {formatNotificationDate(notification.createdAt)}
        </time>
      </SubmitButton>
    </ActionForm>
  );
}

function useDismissibleNotificationDetails() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(returnFocus: boolean) {
      const details = detailsRef.current;
      if (!details?.open) return;
      details.open = false;
      if (returnFocus) details.querySelector("summary")?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) close(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }

    function handleClick(event: MouseEvent) {
      if ((event.target as Element | null)?.closest("a")) close(false);
    }

    const details = detailsRef.current;
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    details?.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      details?.removeEventListener("click", handleClick);
    };
  }, []);

  return detailsRef;
}
