import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import {
  countMemberSkillAssessments,
  countMemberSkills,
  countPendingSkillAssessments
} from "@/modules/members/application/member-service";
import { getMyAvatarUpdatedAt } from "@/modules/members/application/member-avatar-service";
import {
  getCheerCelebrations,
  getLevelUpCelebrations
} from "@/modules/growth/application/growth-service";
import { CheerCelebrationDialog } from "@/modules/growth/presentation/cheer-celebration-dialog";
import { LevelUpCelebrationDialog } from "@/modules/growth/presentation/level-up-celebration-dialog";
import {
  countUnreadNotifications,
  listLatestUnreadNotifications
} from "@/modules/notifications/application/notification-service";
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
    latestUnreadNotifications,
    assessmentCount,
    pendingApprovalCount,
    approvedSkillCount,
    levelUpCelebrations,
    cheerCelebrations,
    avatarUpdatedAt
  ] = await Promise.all([
    session.user.memberId
      ? countUnreadNotifications(session.user.memberId)
      : Promise.resolve(0),
    session.user.memberId
      ? listLatestUnreadNotifications(session.user.memberId)
      : Promise.resolve([]),
    session.user.memberId
      ? countMemberSkillAssessments(session.user.memberId)
      : Promise.resolve(0),
    isManagementRole
      ? countPendingSkillAssessments(
          session.user.role as "ADMIN" | "MANAGER",
          session.user.memberId!
        )
      : Promise.resolve(0),
    session.user.memberId
      ? countMemberSkills(session.user.memberId)
      : Promise.resolve(0),
    session.user.memberId && !session.user.passwordChangeRequired
      ? getLevelUpCelebrations(session.user.memberId)
      : Promise.resolve([]),
    session.user.memberId && !session.user.passwordChangeRequired
      ? getCheerCelebrations(session.user.memberId)
      : Promise.resolve([]),
    session.user.memberId
      ? getMyAvatarUpdatedAt(session.user.memberId)
      : Promise.resolve(null)
  ]);
  const setupProgress = session.user.memberId
    ? buildSetupProgress({
        passwordChangeRequired: session.user.passwordChangeRequired,
        assessmentCount,
        approvedSkillCount
      })
    : null;

  return (
    <AppShell
      user={{
        name: session.user.name,
        role: session.user.role,
        memberId: session.user.memberId!,
        avatarUpdatedAt: avatarUpdatedAt?.toISOString() ?? null
      }}
      unreadNotificationCount={unreadNotificationCount}
      latestUnreadNotifications={latestUnreadNotifications}
      pendingApprovalCount={pendingApprovalCount}
      setupProgress={setupProgress}
    >
      {children}
      <LevelUpCelebrationDialog celebrations={levelUpCelebrations} />
      <CheerCelebrationDialog
        key={
          levelUpCelebrations.length > 0
            ? "cheer-celebrations-blocked"
            : cheerCelebrations[0]?.notificationId ?? "no-cheer-celebrations"
        }
        celebrations={levelUpCelebrations.length === 0 ? cheerCelebrations : []}
      />
    </AppShell>
  );
}
