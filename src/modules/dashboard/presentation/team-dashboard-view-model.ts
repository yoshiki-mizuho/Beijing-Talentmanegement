import {
  aggregateMissingSkills,
  buildMonthComparison,
  findAlmostThereMembers,
  findInactiveMembers,
  getTeamGrowthMessage,
  hasAchievedTargetRole,
  shiftDashboardMonth
} from "@/modules/dashboard/domain/team-dashboard";
import type { TeamDashboardResult } from "@/modules/dashboard/application/team-dashboard-service";

const millisecondsPerDay = 86_400_000;

export function buildTeamDashboardViewModel(data: TeamDashboardResult) {
  const currentLevelUps = data.levelChanges.filter((change) =>
    isLevelUpInRange(change, data.month.start, data.month.end)
  ).length;
  const previousLevelUps = data.levelChanges.filter((change) =>
    isLevelUpInRange(change, data.month.previousStart, data.month.start)
  ).length;
  const longestWaitingDays = data.pendingAssessments.length === 0
    ? 0
    : Math.max(...data.pendingAssessments.map((assessment) =>
        Math.max(0, Math.floor((data.now.getTime() - assessment.createdAt.getTime()) / millisecondsPerDay))
      ));
  const missingSkills = aggregateMissingSkills(data.members).slice(0, 5);

  return {
    manager: data.manager,
    memberCount: data.members.length,
    month: {
      ...data.month,
      previousKey: shiftDashboardMonth(data.month.key, -1),
      nextKey: shiftDashboardMonth(data.month.key, 1)
    },
    encouragement: getTeamGrowthMessage(currentLevelUps),
    kpis: {
      pending: {
        count: data.pendingAssessments.length,
        longestWaitingDays,
        needsAttention: longestWaitingDays >= 5
      },
      levelUps: {
        count: currentLevelUps,
        comparison: buildMonthComparison(currentLevelUps, previousLevelUps)
      },
      achieved: data.members.filter(hasAchievedTargetRole).length,
      targetSet: data.members.filter((member) => member.targetRole !== null).length
    },
    almostThere: findAlmostThereMembers(data.members),
    inactiveMembers: findInactiveMembers(data.members, data.now),
    feed: data.feed.map((item) => ({
      ...item,
      changedAt: item.changedAt.toISOString(),
      comments: item.comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString()
      }))
    })),
    missingSkills,
    topMissingSkillExpertCount: data.topMissingSkillExpertCount
  };
}

function isLevelUpInRange(
  change: { fromLevel: number | null; toLevel: number; changedAt: Date },
  start: Date,
  end: Date
) {
  return (
    change.changedAt >= start &&
    change.changedAt < end &&
    (change.fromLevel === null || change.toLevel > change.fromLevel)
  );
}

export type TeamDashboardViewModel = ReturnType<typeof buildTeamDashboardViewModel>;
