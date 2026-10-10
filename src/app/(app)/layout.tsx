import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import {
  countMemberSkillAssessments,
  countMemberSkills,
  countPendingSkillAssessments,
  hasMemberTargetRole
} from "@/modules/members/application/member-service";
import { getLevelUpCelebrations } from "@/modules/growth/application/growth-service";
import { LevelUpCelebrationDialog } from "@/modules/growth/presentation/level-up-celebration-dialog";
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
    assessmentCount,
    pendingApprovalCount,
    approvedSkillCount,
    hasTargetRole,
    levelUpCelebrations
  ] = await Promise.all([
    session.user.memberId
      ? countUnreadNotifications(session.user.memberId)
      : Promise.resolve(0),
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
    session.user.memberId
      ? hasMemberTargetRole(session.user.memberId)
      : Promise.resolve(false),
    session.user.memberId && !session.user.passwordChangeRequired
      ? getLevelUpCelebrations(session.user.memberId)
      : Promise.resolve([])
  ]);
  const setupProgress = session.user.memberId
    ? buildSetupProgress({
        passwordChangeRequired: session.user.passwordChangeRequired,
        assessmentCount,
        approvedSkillCount,
        hasTargetRole
      })
    : null;

  return (
    <AppShell
      user={{
        name: session.user.name,
        role: session.user.role,
        memberId: session.user.memberId!
      }}
      unreadNotificationCount={unreadNotificationCount}
      pendingApprovalCount={pendingApprovalCount}
      setupProgress={setupProgress}
    >
      {children}
      <LevelUpCelebrationDialog celebrations={levelUpCelebrations} />
    </AppShell>
  );
}
