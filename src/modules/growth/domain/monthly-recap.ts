import type { BadgeId } from "@/modules/growth/domain/badge-art";
import { getTokyoMonthKey } from "@/modules/growth/domain/growth-insights";
import { isGrowthLevelChange } from "@/modules/growth/domain/level-change-source";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

export type RecapLevelChange = {
  id: string;
  skillId: string;
  skillName: string;
  fromLevel: number | null;
  toLevel: number;
  source: string;
  changedAt: Date | string;
  reactionCount: number;
  commentCount: number;
};

export type RecapAssessment = {
  skillId: string;
  skillName: string;
  status: "APPROVED" | "CORRECTED" | "REJECTED" | "PENDING";
  createdAt: Date | string;
};

export type RecapVoice = {
  kind: "cheer" | "reaction" | "comment";
  createdAt: Date | string;
  senderId: string;
  senderName: string;
  text?: string;
  reactionType?: "CONGRATS" | "AMAZING" | "WANT_TO_LEARN";
};

export type RecapRole = {
  name: string;
  requirements: ReadonlyArray<{
    skillId: string;
    skillName: string;
    requiredLevel: number;
    isRequired: boolean;
    anyOfGroup: number | null;
  }>;
};

export type MonthlyRecapInput = {
  memberId: string;
  memberCreatedAt: Date | string;
  month: string;
  latestCompletedMonth: string;
  currentSkills: ReadonlyArray<{ skillId: string; skillName: string; level: number }>;
  levelChanges: ReadonlyArray<RecapLevelChange>;
  assessments: ReadonlyArray<RecapAssessment>;
  voices: ReadonlyArray<RecapVoice>;
  badges: ReadonlyArray<{ id: BadgeId; name: string; earnedAt: Date | string | null }>;
  targetRole: RecapRole | null;
};

export function buildMonthlyRecap(input: MonthlyRecapInput) {
  const levelUps = input.levelChanges.filter(isLevelUp);
  const selectedLevelUps = levelUps
    .filter((change) => getTokyoMonthKey(change.changedAt) === input.month)
    .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());
  const previousMonth = shiftMonth(input.month, -1);
  const previousLevelUpCount = levelUps.filter(
    (change) => getTokyoMonthKey(change.changedAt) === previousMonth
  ).length;
  const assessments = input.assessments.filter(
    (assessment) => getTokyoMonthKey(assessment.createdAt) === input.month
  );
  const voices = input.voices.filter(
    (voice) => voice.senderId !== input.memberId && getTokyoMonthKey(voice.createdAt) === input.month
  );
  const badges = input.badges.filter(
    (badge) => badge.earnedAt && getTokyoMonthKey(badge.earnedAt) === input.month
  );
  const assessmentCounts = {
    approved: assessments.filter((item) => item.status === "APPROVED" || item.status === "CORRECTED").length,
    rejected: assessments.filter((item) => item.status === "REJECTED").length,
    pending: assessments.filter((item) => item.status === "PENDING").length
  };
  const voiceCounts = {
    cheers: voices.filter((item) => item.kind === "cheer").length,
    reactions: voices.filter((item) => item.kind === "reaction").length,
    comments: voices.filter((item) => item.kind === "comment").length
  };
  const roleProgress = input.targetRole
    ? buildRoleProgress(input.targetRole, input.currentSkills, input.levelChanges, input.month)
    : null;
  const hasEvents = selectedLevelUps.length + assessments.length + voices.length + badges.length > 0;

  return {
    month: input.month,
    levelUps: selectedLevelUps,
    levelUpCount: selectedLevelUps.length,
    newSkillCount: selectedLevelUps.filter((change) => change.fromLevel === null).length,
    assessmentCount: assessments.length,
    assessmentCounts,
    voiceCount: voices.length,
    voiceCounts,
    levelUpDifference: selectedLevelUps.length - previousLevelUpCount,
    levelUpDifferenceLabel: formatLevelUpDifference(previousMonth, selectedLevelUps.length - previousLevelUpCount),
    badges,
    roleProgress,
    history: Array.from({ length: 12 }, (_, index) => {
      const month = shiftMonth(input.month, index - 11);
      return { month, count: levelUps.filter((change) => getTokyoMonthKey(change.changedAt) === month).length };
    }),
    messages: voices
      .filter((voice) => voice.kind !== "reaction" && voice.text)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 3),
    reactions: {
      CONGRATS: voices.filter((voice) => voice.reactionType === "CONGRATS").length,
      AMAZING: voices.filter((voice) => voice.reactionType === "AMAZING").length,
      WANT_TO_LEARN: voices.filter((voice) => voice.reactionType === "WANT_TO_LEARN").length
    },
    hasEvents,
    encouragement: getPastMonthlyEncouragement(selectedLevelUps.length, hasEvents),
    nextStep: input.month === input.latestCompletedMonth && roleProgress && !roleProgress.achieved
      ? buildNextStep(input.targetRole!, roleProgress.missing)
      : null,
    rejectedAssessments: assessments.filter((assessment) => assessment.status === "REJECTED")
  };
}

function buildRoleProgress(
  role: RecapRole,
  currentSkills: MonthlyRecapInput["currentSkills"],
  changes: MonthlyRecapInput["levelChanges"],
  month: string
) {
  const monthStart = tokyoMonthStart(month);
  const monthEnd = tokyoMonthStart(shiftMonth(month, 1));
  const startSkills = restoreSkills(currentSkills, changes, monthStart);
  const endSkills = restoreSkills(currentSkills, changes, monthEnd);
  const start = evaluateRoleAchievement([...role.requirements], startSkills);
  const end = evaluateRoleAchievement([...role.requirements], endSkills);
  return {
    roleName: role.name,
    startPercentage: Math.round(start.achievementRate * 100),
    endPercentage: Math.round(end.achievementRate * 100),
    achieved: end.achieved,
    missing: end.missingRequirements,
    missingCount: end.missingRequirements.length
  };
}

function restoreSkills(
  current: MonthlyRecapInput["currentSkills"],
  changes: MonthlyRecapInput["levelChanges"],
  before: Date
) {
  const levels = new Map(current.map((skill) => [skill.skillId, skill.level]));
  [...changes]
    .filter((change) => new Date(change.changedAt) >= before)
    .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())
    .forEach((change) => {
      if (change.fromLevel === null) levels.delete(change.skillId);
      else levels.set(change.skillId, change.fromLevel);
    });
  return [...levels].map(([skillId, level]) => ({ skillId, level }));
}

function buildNextStep(
  role: RecapRole,
  missing: ReadonlyArray<{
    skillName?: string;
    requiredLevel: number;
    memberLevel?: number | null;
  }>
) {
  const nearest = [...missing]
    .sort((left, right) =>
      (left.requiredLevel - (left.memberLevel ?? 0)) -
      (right.requiredLevel - (right.memberLevel ?? 0))
    )
    .slice(0, 2);
  return `${role.name}まで、あと${missing.length}スキル（${nearest.map((item) => `${item.skillName ?? "スキル"} Lv${item.requiredLevel}`).join("、")}）です。`;
}

export function getPastMonthlyEncouragement(levelUpCount: number, hasEvents: boolean) {
  if (!hasEvents) return "記録がない月も、次の一歩の準備期間です。";
  if (levelUpCount === 0) return "申請や応援など、次につながる動きがあった1か月でした。";
  if (levelUpCount === 1) return "1回のレベルアップ。次につながる一歩を踏み出しました。";
  if (levelUpCount <= 3) return `${levelUpCount}回のレベルアップ。コツコツが形になった1か月でした。`;
  return `${levelUpCount}回のレベルアップ。大きく力を伸ばした1か月でした。`;
}

export function formatLevelUpDifference(previousMonth: string, difference: number) {
  const month = Number(previousMonth.slice(5));
  if (difference === 0) return `${month}月と同じ`;
  return `${month}月より ${difference > 0 ? "+" : "−"}${Math.abs(difference)}`;
}

export function getViewableRecapMonths(memberCreatedAt: Date | string, now: Date = new Date()) {
  const first = getTokyoMonthKey(memberCreatedAt);
  const latest = shiftMonth(getTokyoMonthKey(now), -1);
  const months: string[] = [];
  for (let month = first; month <= latest; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

export function shouldShowMonthlyRecap(input: {
  memberCreatedAt: Date | string;
  now?: Date;
  lastRecapSeenMonth: string | null;
  hasEvents: boolean;
}) {
  const now = input.now ?? new Date();
  const currentMonth = getTokyoMonthKey(now);
  const previousMonth = shiftMonth(currentMonth, -1);
  return getTokyoMonthKey(input.memberCreatedAt) < currentMonth &&
    input.lastRecapSeenMonth !== previousMonth && input.hasEvents;
}

export function buildRecapNoteDraft(event: {
  kind: "level-up" | "new-skill" | "rejected" | "target-role";
  skillName?: string;
  level?: number;
  missingCount?: number;
  missingSkills?: string[];
}) {
  if (event.kind === "new-skill") return `${event.skillName} を新しく身につけた。きっかけと使いどころを聞く`;
  if (event.kind === "rejected") return `${event.skillName} の差し戻しの理由を一緒に確認し、次の申請に向けて話す`;
  if (event.kind === "target-role") return `目標ロールまであと${event.missingCount}スキル（${event.missingSkills?.join("、")}）。来月の計画を話す`;
  return `${event.skillName} が Lv${event.level} になった。どんな経験が効いたか、次に挑戦したいことを聞く`;
}

export function shiftMonth(month: string, amount: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, value! - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function tokyoMonthStart(month: string) {
  return new Date(`${month}-01T00:00:00+09:00`);
}

function isLevelUp(change: RecapLevelChange) {
  return isGrowthLevelChange(change.source) &&
    (change.fromLevel === null || change.toLevel > change.fromLevel);
}
