import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import { countUnreadNotifications } from "@/modules/notifications/application/notification-service";
import { getCurrentSession } from "@/server/auth/session";
import {
  canAccessAppPath,
  getUnauthorizedRedirectPath
} from "@/shared/auth/app-access";
import { AppShell } from "@/shared/ui/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const requestPath = (await headers()).get("x-pathname") ?? "";

  if (session.user.passwordChangeRequired && requestPath !== "/account/password") {
    redirect("/account/password" as Route);
  }

  if (!canAccessAppPath(session.user.role, requestPath)) {
    redirect(getUnauthorizedRedirectPath() as Route);
  }

  const unreadNotificationCount = session.user.memberId
    ? await countUnreadNotifications(session.user.memberId)
    : 0;

  return (
    <AppShell
      user={{
        name: session.user.name,
        role: session.user.role
      }}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}