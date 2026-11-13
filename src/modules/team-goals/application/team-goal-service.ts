import type { AuthRole, TeamGoal } from "@prisma/client";

import {
  formatTeamGoalPeriod,
  formatTeamGoalCelebrationAriaLabel,
  formatTeamGoalCelebrationResult,
  formatTeamGoalText,
  getPreviousTeamGoalPeriod,
  getRemainingDays,
  getTeamGoalPeriod,
  getTokyoMonth,
  isDateInTeamGoalPeriod,
  selectTeamGoalCelebration,
  teamGoalInputSchema,
  teamGoalUnit
} from "@/modules/team-goals/domain/team-goal";
import {
  countGoalProgress,
  createTeamGoalAcknowledgement,
  findActiveSkill,
  findTeamGoalAcknowledgementTarget,
  findTeamGoalCelebrationCandidates,
  findTeamGoalCelebrationContext,
  findLatestGoals,
  findMemberManagerId,
  findManagerWithReports,
  listActiveSkills,
  markGoalAchieved,
  saveTeamGoal
} from "@/modules/team-goals/infrastructure/team-goal-repository";
import { AuthorizationError } from "@/server/auth/authorization";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export async function getManagerTeamGoal(managerId: string, now = new Date()) {
  const manager = await findManagerWithReports(managerId);
  if (!manager || manager.reports.length === 0) return null;
  const [goal, skills] = await Promise.all([
    resolveCurrentGoal(managerId, now),
    listActiveSkills(managerId)
  ]);
  const previous = await getPreviousResults(managerId, now);
  return { goal, skills, previous, currentMonth: getTokyoMonth(now) };
}

export async function getMemberTeamGoal(memberId: string, now = new Date()) {
  const member = await findMemberManagerId(memberId);
  return member?.managerId ? resolveCurrentGoal(member.managerId, now) : null;
}

export async function getTeamGoalCelebration(memberId: string, now = new Date()) {
  const context = await findTeamGoalCelebrationContext(memberId);
  if (!context) return null;
  const managerIds = [context.id];
  if (context.status === "ACTIVE" && context.managerId) managerIds.push(context.managerId);
  const candidates = await findTeamGoalCelebrationCandidates(
    managerIds,
    context.teamGoalAcknowledgements.map((item) => item.teamGoalId)
  );
  const goal = selectTeamGoalCelebration(candidates, managerIds, now);
  if (!goal) return null;
  const unit = teamGoalUnit(goal.kind);
  return {
    id: goal.id,
    heading: formatTeamGoalPeriod(goal.startMonth, goal.months),
    result: formatTeamGoalCelebrationResult({
      ...goal,
      skillName: goal.skill?.name ?? null
    }),
    ariaLabel: formatTeamGoalCelebrationAriaLabel(goal.targetCount, unit)
  };
}

export async function acknowledgeTeamGoalCelebration(teamGoalId: string, memberId: string) {
  const goal = await findTeamGoalAcknowledgementTarget(teamGoalId, memberId);
  const isTarget = goal && (
    goal.managerId === memberId || goal.manager.reports.length > 0
  );
  if (!goal?.achievedAt || !isTarget) return;
  await createTeamGoalAcknowledgement(goal.id, memberId);
}

export async function upsertTeamGoal(input: unknown, actor: {
  memberId: string | null;
  role: AuthRole;
}, now = new Date()) {
  if (!actor.memberId || !["MANAGER", "ADMIN"].includes(actor.role)) {
    throw new AuthorizationError("チーム目標を決める権限がありません。", 403);
  }
  const parsed = teamGoalInputSchema.parse(input);
  const manager = await findManagerWithReports(actor.memberId);
  if (!manager || manager.reports.length === 0) {
    throw new AuthorizationError("チーム目標を決める権限がありません。", 403);
  }
  const current = await resolveCurrentGoal(actor.memberId, now);
  if (parsed.id && (!current || current.id !== parsed.id || current.achieved)) {
    throw new AuthorizationError("このチーム目標は変更できません。", 403);
  }
  if (parsed.id) {
    const period = getTeamGoalPeriod(current!.startMonth, parsed.months);
    if (now < period.start || now >= period.end) {
      throw new UserFacingError("今日が期間に入る長さを選んでください。");
    }
  }
  if (!parsed.id && current && !current.achieved) {
    throw new UserFacingError("進行中の目標は鉛筆ボタンから変更してください。");
  }
  if (parsed.kind === "SKILL_REACH" && !(await findActiveSkill(parsed.skillId!))) {
    throw new UserFacingError("選んだスキルは使えません。別のスキルを選んでください。");
  }
  const goal = await saveTeamGoal({
    id: parsed.id,
    managerId: actor.memberId,
    kind: parsed.kind,
    skillId: parsed.kind === "SKILL_REACH" ? parsed.skillId! : null,
    targetLevel: parsed.kind === "SKILL_REACH" ? parsed.targetLevel! : null,
    targetCount: parsed.targetCount,
    note: parsed.note || null,
    startMonth: parsed.id ? current!.startMonth : getTokyoMonth(now),
    months: parsed.months
  });
  return resolveGoal(goal, now);
}

async function resolveCurrentGoal(managerId: string, now: Date) {
  const goals = await findLatestGoals(managerId);
  const goal = goals.find((item) => isDateInTeamGoalPeriod(now, item.startMonth, item.months));
  return goal ? resolveGoal(goal, now) : null;
}

async function resolveGoal(goal: TeamGoal & {
  skill?: { name: string } | null;
  manager?: { id: string; name: string; avatarUpdatedAt: Date | null };
}, now: Date) {
  const period = getTeamGoalPeriod(goal.startMonth, goal.months);
  const progress = await countGoalProgress(goal, period.start, period.end);
  if (progress >= goal.targetCount && !goal.achievedAt) {
    await markGoalAchieved(goal.id, now);
  }
  const achieved = Boolean(goal.achievedAt) || progress >= goal.targetCount;
  return {
    id: goal.id,
    kind: goal.kind,
    skillId: goal.skillId,
    targetLevel: goal.targetLevel,
    targetCount: goal.targetCount,
    note: goal.note,
    startMonth: goal.startMonth,
    months: goal.months,
    progress,
    achieved,
    heading: formatTeamGoalPeriod(goal.startMonth, goal.months),
    text: formatTeamGoalText({ ...goal, skillName: goal.skill?.name ?? null }),
    unit: teamGoalUnit(goal.kind),
    remainingDays: getRemainingDays(now, period.end),
    manager: goal.manager ? {
      ...goal.manager,
      avatarUpdatedAt: goal.manager.avatarUpdatedAt?.toISOString() ?? null
    } : null
  };
}

async function getPreviousResults(managerId: string, now: Date) {
  const startMonth = getTokyoMonth(now);
  return Object.fromEntries(await Promise.all([1, 3, 6, 12].flatMap((months) =>
    (["LEVEL_UP_COUNT", "LEVEL_UP_MEMBERS"] as const).map(async (kind) => {
      const period = getPreviousTeamGoalPeriod(startMonth, months);
      const goal = { managerId, kind, skillId: null, targetLevel: null } as TeamGoal;
      return [`${months}:${kind}`, await countGoalProgress(goal, period.start, period.end)];
    })
  )));
}

export type ManagerTeamGoalData = NonNullable<Awaited<ReturnType<typeof getManagerTeamGoal>>>;
export type TeamGoalCardData = NonNullable<Awaited<ReturnType<typeof getMemberTeamGoal>>>;
export type TeamGoalCelebrationData = NonNullable<Awaited<ReturnType<typeof getTeamGoalCelebration>>>;
