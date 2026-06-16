import { NotificationStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { listNotifications } from "@/modules/notifications/application/notification-service";
import { markNotificationReadAction } from "@/modules/notifications/presentation/actions";
import { getCurrentSession } from "@/server/auth/session";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    redirect("/login");
  }

  const notifications = await listNotifications(session.user.memberId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">通知</h1>
        <p className="mt-1 text-sm text-slate-600">
          承認依頼と承認結果を確認します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>通知一覧</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.map((notification) => (
            <form
              key={notification.id}
              action={markNotificationReadAction}
              className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_auto]"
            >
              <input type="hidden" name="id" value={notification.id} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-950">
                    {notification.title}
                  </p>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {notification.status}
                  </span>
                </div>
                {notification.body && (
                  <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                )}
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={notification.status === NotificationStatus.READ}
              >
                既読
              </Button>
            </form>
          ))}
          {notifications.length === 0 && (
            <p className="text-sm text-slate-600">通知はありません。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
