import { Bell } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  countUnreadNotifications,
  listNotifications
} from "@/modules/notifications/application/notification-service";
import { markAllNotificationsReadAction } from "@/modules/notifications/presentation/actions";
import { NotificationConfirmForm } from "@/modules/notifications/presentation/notification-confirm-form";
import { formatNotificationDate } from "@/modules/notifications/presentation/notification-date";
import { getNotificationDestination } from "@/modules/notifications/presentation/notification-destination";
import { getCurrentSession } from "@/server/auth/session";
import { ActionForm } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    redirect("/login");
  }

  const params = await searchParams;
  const unreadOnly = (Array.isArray(params.view) ? params.view[0] : params.view) === "unread";
  const [notifications, unreadCount] = await Promise.all([
    listNotifications(session.user.memberId, { unreadOnly }),
    countUnreadNotifications(session.user.memberId)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="通知"
        description="申告依頼や申告結果を確認し、必要な対応画面へ進みます。"
      />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div className="space-y-3">
            <CardTitle>通知一覧</CardTitle>
            <nav aria-label="通知の絞り込み" className="flex items-center gap-2">
              <NotificationFilterLink href="/notifications" active={!unreadOnly}>
                すべて
              </NotificationFilterLink>
              <NotificationFilterLink href="/notifications?view=unread" active={unreadOnly}>
                未読
                {unreadCount > 0 ? <span className="tabular-nums">{unreadCount}</span> : null}
              </NotificationFilterLink>
            </nav>
          </div>
          <ActionForm action={markAllNotificationsReadAction}>
            <SubmitButton
              variant="secondary"
              pendingLabel="既読にしています…"
              disabled={unreadCount === 0}
            >
              すべて既読にする
            </SubmitButton>
          </ActionForm>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.map((notification) => {
            const destination = getNotificationDestination({
              type: notification.type,
              role: session.user.role,
              skillSelfAssessmentId: notification.skillSelfAssessmentId
            });

            return (
              <NotificationConfirmForm
                key={notification.id}
                id={notification.id}
                destination={destination ?? "/notifications"}
                unread={notification.status === "UNREAD"}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {notification.title}
                    </p>
                    <Badge variant={notification.status === "UNREAD" ? "primary" : "neutral"}>
                      {notification.status === "UNREAD" ? "未読" : "確認済み"}
                    </Badge>
                    <time
                      dateTime={notification.createdAt.toISOString()}
                      title={new Intl.DateTimeFormat("ja-JP", {
                        dateStyle: "long",
                        timeStyle: "short",
                        timeZone: "Asia/Tokyo"
                      }).format(notification.createdAt)}
                      className="text-xs text-[var(--muted-foreground)]"
                    >
                      {formatNotificationDate(notification.createdAt)}
                    </time>
                  </div>
                  {notification.body && (
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {notification.body}
                    </p>
                  )}
                </div>
              </NotificationConfirmForm>
            );
          })}
          {notifications.length === 0 && (
            <EmptyState
              icon={Bell}
              title={unreadOnly ? "未読の通知はありません" : "通知はありません"}
              description={unreadOnly
                ? "すべて確認できています。新しい通知が届くと、ここに表示されます。"
                : "新しい申告依頼や申告結果が届くと、ここに表示されます。"}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationFilterLink({
  href,
  active,
  children
}: {
  href: Route;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={active
        ? "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        : "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"}
    >
      {children}
    </Link>
  );
}
