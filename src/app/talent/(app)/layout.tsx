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
import {
  fallbackMemberProfile,
  resolveMemberProfiles
} from "@/modules/members/application/member-directory";
import {
  getCheerCelebrations,
  getLevelUpCelebrations,
  getRoleAchievementCelebration
} from "@/modules/growth/application/growth-service";
import { getMonthlyRecapCelebration } from "@/modules/growth/application/monthly-recap-service";
import { CheerCelebrationDialog } from "@/modules/growth/presentation/cheer-celebration-dialog";
import { LevelUpCelebrationDialog } from "@/modules/growth/presentation/level-up-celebration-dialog";
import { MonthlyRecapDialog } from "@/modules/growth/presentation/monthly-recap-dialog";
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

  if (!session) redirect("/talent/unregistered");

  const requestPath = (await headers()).get("x-pathname") ?? "";

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
    roleAchievementCelebration,
    cheerCelebrations,
    monthlyRecapCelebration,
    memberProfiles,
    hasTargetRole
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
    getLevelUpCelebrations(session.user.memberId),
    getRoleAchievementCelebration(session.user.memberId),
    getCheerCelebrations(session.user.memberId),
    getMonthlyRecapCelebration(session.user.memberId),
    resolveMemberProfiles([session.user.memberId]),
    session.user.memberId
      ? hasMemberTargetRole(session.user.memberId)
      : Promise.resolve(false)
  ]);
  const memberProfile = memberProfiles.get(session.user.memberId) ??
    fallbackMemberProfile(session.user.memberId);
  const setupProgress = session.user.memberId
    ? buildSetupProgress({
        hasTargetRole,
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
        avatarUrl: memberProfile.avatarUrl,
        avatarColor: memberProfile.avatarColor
      }}
      unreadNotificationCount={unreadNotificationCount}
      latestUnreadNotifications={latestUnreadNotifications}
      pendingApprovalCount={pendingApprovalCount}
      setupProgress={setupProgress}
    >
      {children}
      <LevelUpCelebrationDialog
        celebrations={levelUpCelebrations}
        roleAchievement={roleAchievementCelebration}
        memberId={session.user.memberId!}
      />
      <CheerCelebrationDialog
        key={
          levelUpCelebrations.length > 0
            ? "cheer-celebrations-blocked"
            : cheerCelebrations[0]?.notificationId ?? "no-cheer-celebrations"
        }
        celebrations={levelUpCelebrations.length === 0 ? cheerCelebrations : []}
      />
      <MonthlyRecapDialog
        celebration={
          levelUpCelebrations.length === 0 &&
          cheerCelebrations.length === 0 &&
          !roleAchievementCelebration
            ? monthlyRecapCelebration
            : null
        }
      />
    </AppShell>
  );
}
