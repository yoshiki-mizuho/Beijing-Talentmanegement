import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import {
  listMemberSkillAssessments,
  listMembers,
  listPendingSkillAssessments
} from "@/modules/members/application/member-service";
import { countUnreadNotifications } from "@/modules/notifications/application/notification-service";
import { getCurrentSession } from "@/server/auth/session";
import {
  canAccessAppPath,
  getUnauthorizedRedirectPath
} from "@/shared/auth/app-access";
import { AppShell } from "@/shared/ui/app-shell";
import { buildSetupProgress } from "@/shared/ui/setup-progress";

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

  const isManagementRole =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";
  const [
    unreadNotificationCount,
    memberAssessments,
    pendingAssessments,
    members
  ] = await Promise.all([
    session.user.memberId
      ? countUnreadNotifications(session.user.memberId)
      : Promise.resolve(0),
    session.user.memberId
      ? listMemberSkillAssessments(session.user.memberId)
      : Promise.resolve([]),
    isManagementRole ? listPendingSkillAssessments() : Promise.resolve([]),
    session.user.memberId
      ? listMembers(session.user.email ? { q: session.user.email } : undefined)
      : Promise.resolve([])
  ]);
  const approvedSkillCount =
    members.find((member) => member.id === session.user.memberId)?.memberSkills
      .length ?? 0;
  const setupProgress = session.user.memberId
    ? buildSetupProgress({
        passwordChangeRequired: session.user.passwordChangeRequired,
        assessmentCount: memberAssessments.length,
        approvedSkillCount
      })
    : null;

  return (
    <AppShell
      user={{
        name: session.user.name,
        role: session.user.role
      }}
      unreadNotificationCount={unreadNotificationCount}
      pendingApprovalCount={pendingAssessments.length}
      setupProgress={setupProgress}
    >
      {children}
    </AppShell>
  );
}
