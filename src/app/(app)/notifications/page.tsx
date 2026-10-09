import { Bell } from "lucide-react";
import { redirect } from "next/navigation";

import { listNotifications } from "@/modules/notifications/application/notification-service";
import { NotificationConfirmForm } from "@/modules/notifications/presentation/notification-confirm-form";
import { getNotificationDestination } from "@/modules/notifications/presentation/notification-destination";
import { getCurrentSession } from "@/server/auth/session";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    redirect("/login");
  }

  const notifications = await listNotifications(session.user.memberId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="通知"
        description="申告依頼や申告結果を確認し、必要な対応画面へ進みます。"
      />

      <Card>
        <CardHeader>
          <CardTitle>通知一覧</CardTitle>
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
              title="通知はありません"
              description="新しい申告依頼や申告結果が届くと、ここに表示されます。"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
