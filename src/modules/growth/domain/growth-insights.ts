import type { BadgeId } from "@/modules/growth/domain/badge-art";
import { isRoleAchieved } from "@/modules/roles/domain/role-achievement";
import { isGrowthLevelChange } from "./level-change-source";

const TOKYO_TIME_ZONE = "Asia/Tokyo";

type DatedValue = { createdAt: Date | string };

export type GrowthLevelChange = {
  id?: string;
  skillId: string;
  fromLevel: number | null;
  toLevel: number;
  source: string;
  changedAt: Date | string;
  categoryGroupId?: string | null;
};

export type BadgeProgress = {
  id: BadgeId;
  current?: number;
  target?: number;
  text: string;
};

export type BadgeAchievement = {
  id: BadgeId;
  earnedAt: Date | null;
};

export function getMonthlyEncouragement(levelUpCount: number) {
  if (levelUpCount <= 0) {
    return "今月の一歩はこれから。小さな前進も記録していきましょう。";
  }
  if (levelUpCount === 1) {
    return "今月、ひとつ成長を積み重ねました。次の一歩も楽しみですね。";
  }
  if (levelUpCount <= 3) {
    return `今月は${levelUpCount}件レベルアップ。着実な前進が続いています。`;
  }
  return `今月は${levelUpCount}件レベルアップ。大きく力を伸ばした1か月です。`;
}

export function calculateBadgeAchievements(input: {
  assessments: ReadonlyArray<DatedValue & { skillId?: string; status?: string; reviewedAt?: Date | string | null }>;
  memberSkills: ReadonlyArray<{ skillId: string; level: number }>;
  levelChanges: ReadonlyArray<GrowthLevelChange>;
  targetRequirements: ReadonlyArray<{ skillId: string; requiredLevel: number; isRequired?: boolean; anyOfGroup?: number | null }>;
  targetAchievements?: ReadonlyArray<{ achievedAt: Date | string; achievedAsTarget: boolean }>;
  mentoredCheers: ReadonlyArray<{ toMemberId: string; createdAt: Date | string }>;
  memberCreatedAt?: Date | string;
  sentCheers?: ReadonlyArray<{ toMemberId: string; createdAt: Date | string }>;
  sentReactions?: ReadonlyArray<{ createdAt: Date | string }>;
  receivedTeachReactions?: ReadonlyArray<{ memberId: string; createdAt: Date | string }>;
  firstMoverLevelChangeIds?: ReadonlyArray<string>;
  prerequisites?: ReadonlyArray<{ skillId: string; prerequisiteSkillId: string }>;
  now?: Date;
}): BadgeAchievement[] {
  const assessments = sortByDate(input.assessments, "createdAt");
  const changes = sortByDate(input.levelChanges, "changedAt");
  const newSkillChanges = changes.filter((change) => change.fromLevel === null);
  const targetAchievement = [...(input.targetAchievements ?? [])]
    .filter((achievement) => achievement.achievedAsTarget)
    .sort(
      (left, right) =>
        new Date(left.achievedAt).getTime() - new Date(right.achievedAt).getTime()
    )[0];
  const targetChangedAt = targetAchievement?.achievedAt ?? null;
  const uniqueMentees = new Set<string>();
  let thirdMenteeAt: Date | string | null = null;
  for (const cheer of sortByDate(input.mentoredCheers, "createdAt")) {
    uniqueMentees.add(cheer.toMemberId);
    if (uniqueMentees.size === 3) {
      thirdMenteeAt = cheer.createdAt;
      break;
    }
  }
  const upgrades = changes.filter(isLevelUp);
  const sentCheers = sortByDate(input.sentCheers ?? [], "createdAt");
  const sentReactions = sortByDate(input.sentReactions ?? [], "createdAt");
  const teachReactions = sortByDate(input.receivedTeachReactions ?? [], "createdAt");
  const firstMoverIds = new Set(input.firstMoverLevelChangeIds ?? []);
  const firstMover = upgrades.find((change) => change.id && firstMoverIds.has(change.id));
  const categories = new Set<string>();
  let multiClassAt: Date | string | null = null;
  for (const change of upgrades) {
    if (change.categoryGroupId) categories.add(change.categoryGroupId);
    if (categories.size === 3) {
      multiClassAt = change.changedAt;
      break;
    }
  }
  const uniqueCheerTargets = nthUniqueDate(sentCheers, "toMemberId", 3);
  const uniqueTeachers = nthUniqueDate(teachReactions, "memberId", 5);

  return [
    achievement("hello-world", assessments[0]?.createdAt),
    achievement(
      "save-point",
      input.memberSkills.length >= 5 ? newSkillChanges[4]?.changedAt : null
    ),
    achievement(
      "lv4-unlock",
      changes.find((change) => change.toLevel >= 4)?.changedAt
    ),
    achievement("build-streak", findThreeMonthStreakDate(changes)),
    achievement("deployed", targetChangedAt),
    achievement(
      "full-stack",
      input.memberSkills.length >= 10 ? newSkillChanges[9]?.changedAt : null
    ),
    achievement(
      "master",
      changes.find((change) => change.toLevel >= 5)?.changedAt
    ),
    achievement("rubber-duck", thirdMenteeAt),
    achievement("first-mover", firstMover?.changedAt),
    achievement("retry-success", findRetrySuccessDate(input.assessments, upgrades)),
    achievement("combo-10", upgrades[9]?.changedAt),
    achievement("anniversary", findAnniversaryDate(input.memberCreatedAt, upgrades, input.now ?? new Date())),
    achievement("groundwork", findGroundworkDate(input.assessments, changes, input.prerequisites ?? [])),
    achievement("multi-class", multiClassAt),
    achievement("cheer-squad", uniqueCheerTargets),
    achievement("applause", sentReactions[9]?.createdAt),
    achievement("sought-after", uniqueTeachers),
    achievement("new-year-deploy", upgrades.find((change) => getTokyoDateParts(change.changedAt).month === 1)?.changedAt),
    achievement("welcome-back", findWelcomeBackDate(upgrades))
  ];
}

export function calculateBadgeProgress(input: Parameters<typeof calculateBadgeAchievements>[0]): BadgeProgress[] {
  const upgrades = sortByDate(input.levelChanges, "changedAt").filter(isLevelUp);
  const categoryCount = new Set(upgrades.flatMap((change) => change.categoryGroupId ? [change.categoryGroupId] : [])).size;
  const cheerCount = new Set((input.sentCheers ?? []).map((item) => item.toMemberId)).size;
  const teacherCount = new Set((input.receivedTeachReactions ?? []).map((item) => item.memberId)).size;
  const months = input.memberCreatedAt
    ? Math.min(12, Math.max(0, Math.floor(((input.now ?? new Date()).getTime() - new Date(input.memberCreatedAt).getTime()) / 2_629_746_000)))
    : 0;
  const targetRate = input.targetRequirements.length === 0
    ? 0
    : Math.round(isRoleAchieved(
        input.targetRequirements.map((item) => ({ ...item, isRequired: item.isRequired ?? true })),
        [...input.memberSkills]
      ) ? 100 : calculateSatisfiedRequirementRate(input.targetRequirements, input.memberSkills));
  const currentStreak = getCurrentMonthStreak(upgrades);
  const menteeCount = new Set(input.mentoredCheers.map((item) => item.toMemberId)).size;
  // 獲得の判定（新規登録のレベル変更の件数）と同じ数え方にする
  const registeredCount = Math.min(
    input.memberSkills.length,
    input.levelChanges.filter((change) => change.fromLevel === null).length
  );
  return [
    progress("combo-10", upgrades.length, 10, `あと${Math.max(0, 10 - upgrades.length)}回`),
    progress("anniversary", months, 12, `あと${Math.max(0, 12 - months)}か月`),
    progress("multi-class", categoryCount, 3, `あと${Math.max(0, 3 - categoryCount)}つの大分類`),
    progress("cheer-squad", cheerCount, 3, `あと${Math.max(0, 3 - cheerCount)}人に応援を送る`),
    progress("applause", (input.sentReactions ?? []).length, 10, `あと${Math.max(0, 10 - (input.sentReactions ?? []).length)}回`),
    progress("sought-after", teacherCount, 5, `あと${Math.max(0, 5 - teacherCount)}人`),
    progress("save-point", registeredCount, 5, `あと${Math.max(0, 5 - registeredCount)}件`),
    progress("full-stack", registeredCount, 10, `あと${Math.max(0, 10 - registeredCount)}件`),
    progress("build-streak", currentStreak, 3, `あと${Math.max(0, 3 - currentStreak)}か月`),
    progress("deployed", targetRate, 100, `目標ロールまであと${Math.max(0, 100 - targetRate)}%`),
    progress("rubber-duck", menteeCount, 3, `あと${Math.max(0, 3 - menteeCount)}人`),
    { id: "groundwork", text: "前提スキルをすべて Lv3 以上にして申請すると達成" }
  ];
}

function progress(id: BadgeId, current: number, target: number, text: string): BadgeProgress {
  return { id, current: Math.min(current, target), target, text };
}

function isLevelUp(change: GrowthLevelChange) {
  return isGrowthLevelChange(change.source) && (change.fromLevel === null || change.toLevel > change.fromLevel);
}

function nthUniqueDate<T extends DatedValue>(values: ReadonlyArray<T>, key: keyof T, target: number) {
  const unique = new Set<unknown>();
  for (const value of values) {
    unique.add(value[key]);
    if (unique.size === target) return value.createdAt;
  }
  return null;
}

function findRetrySuccessDate(assessments: ReadonlyArray<DatedValue & { skillId?: string; status?: string; reviewedAt?: Date | string | null }>, upgrades: ReadonlyArray<GrowthLevelChange>) {
  const rejectedBySkill = new Map<string, number>();
  for (const assessment of assessments) {
    if (assessment.skillId && assessment.status === "REJECTED" && assessment.reviewedAt) {
      rejectedBySkill.set(assessment.skillId, Math.min(rejectedBySkill.get(assessment.skillId) ?? Infinity, new Date(assessment.reviewedAt).getTime()));
    }
  }
  const approvedBySkill = new Map<string, number[]>();
  for (const assessment of assessments) {
    if (
      assessment.skillId &&
      assessment.reviewedAt &&
      (assessment.status === "APPROVED" || assessment.status === "CORRECTED")
    ) {
      const dates = approvedBySkill.get(assessment.skillId) ?? [];
      dates.push(new Date(assessment.reviewedAt).getTime());
      approvedBySkill.set(assessment.skillId, dates);
    }
  }
  return upgrades.find((change) => {
    const rejectedAt = rejectedBySkill.get(change.skillId) ?? Infinity;
    const changedAt = new Date(change.changedAt).getTime();
    return (approvedBySkill.get(change.skillId) ?? [])
      .some((approvedAt) => rejectedAt < approvedAt && approvedAt <= changedAt);
  })?.changedAt ?? null;
}

function calculateSatisfiedRequirementRate(
  requirements: ReadonlyArray<{ skillId: string; requiredLevel: number }>,
  skills: ReadonlyArray<{ skillId: string; level: number }>
) {
  const levels = new Map(skills.map((item) => [item.skillId, item.level]));
  const satisfied = requirements.filter((item) => (levels.get(item.skillId) ?? 0) >= item.requiredLevel).length;
  return requirements.length === 0 ? 0 : (satisfied / requirements.length) * 100;
}

function getCurrentMonthStreak(upgrades: ReadonlyArray<GrowthLevelChange>) {
  const months = [...new Set(upgrades.map((change) => getTokyoMonthKey(change.changedAt)))].sort().reverse();
  let count = 0;
  for (let index = 0; index < months.length; index += 1) {
    const current = parseMonthKey(months[index]!);
    if (index > 0) {
      const previous = parseMonthKey(months[index - 1]!);
      if (monthSerial(previous.year, previous.month) - monthSerial(current.year, current.month) !== 1) break;
    }
    count += 1;
  }
  return count;
}

function findAnniversaryDate(createdAt: Date | string | undefined, upgrades: ReadonlyArray<GrowthLevelChange>, now: Date) {
  if (!createdAt) return null;
  const joined = new Date(createdAt);
  const anniversary = new Date(joined);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  if (anniversary > now) return null;
  return upgrades.some((change) => new Date(change.changedAt) >= joined && new Date(change.changedAt) <= anniversary) ? anniversary : null;
}

function findGroundworkDate(assessments: ReadonlyArray<DatedValue & { skillId?: string }>, changes: ReadonlyArray<GrowthLevelChange>, prerequisites: ReadonlyArray<{ skillId: string; prerequisiteSkillId: string }>) {
  for (const assessment of sortByDate(assessments, "createdAt")) {
    const required = prerequisites.filter((item) => item.skillId === assessment.skillId);
    if (!required.length) continue;
    const at = new Date(assessment.createdAt).getTime();
    const levels = new Map<string, number>();
    for (const change of changes) if (new Date(change.changedAt).getTime() <= at) levels.set(change.skillId, change.toLevel);
    if (required.every((item) => (levels.get(item.prerequisiteSkillId) ?? 0) >= 3)) return assessment.createdAt;
  }
  return null;
}

function findWelcomeBackDate(upgrades: ReadonlyArray<GrowthLevelChange>) {
  for (let index = 1; index < upgrades.length; index += 1) {
    if (new Date(upgrades[index]!.changedAt).getTime() - new Date(upgrades[index - 1]!.changedAt).getTime() >= 183 * 86_400_000) return upgrades[index]!.changedAt;
  }
  return null;
}

function achievement(id: BadgeId, value: Date | string | null | undefined) {
  return { id, earnedAt: value ? new Date(value) : null };
}

function findThreeMonthStreakDate(changes: ReadonlyArray<GrowthLevelChange>) {
  const upgrades = changes.filter(
    (change) =>
      isGrowthLevelChange(change.source) &&
      (change.fromLevel === null || change.toLevel > change.fromLevel)
  );
  const firstByMonth = new Map<string, GrowthLevelChange>();
  for (const change of upgrades) {
    const key = getTokyoMonthKey(change.changedAt);
    if (!firstByMonth.has(key)) firstByMonth.set(key, change);
  }
  const months = [...firstByMonth.keys()].sort();
  for (let index = 2; index < months.length; index += 1) {
    const first = parseMonthKey(months[index - 2]!);
    const second = parseMonthKey(months[index - 1]!);
    const third = parseMonthKey(months[index]!);
    if (
      monthSerial(second.year, second.month) - monthSerial(first.year, first.month) === 1 &&
      monthSerial(third.year, third.month) - monthSerial(second.year, second.month) === 1
    ) {
      return firstByMonth.get(months[index]!)?.changedAt ?? null;
    }
  }
  return null;
}

export type GrowthCalendarDay = {
  dateKey: string | null;
  day: number | null;
  assessmentCount: number;
  levelUpCount: number;
};

export type GrowthCalendarDayKind = "none" | "assessment" | "level-up";

export function getGrowthCalendarDayKind(
  day: Pick<GrowthCalendarDay, "assessmentCount" | "levelUpCount">
): GrowthCalendarDayKind {
  if (day.levelUpCount > 0) return "level-up";
  if (day.assessmentCount > 0) return "assessment";
  return "none";
}

export function buildGrowthCalendar(input: {
  year: number;
  month: number;
  assessmentDates: ReadonlyArray<Date | string>;
  levelChanges: ReadonlyArray<GrowthLevelChange>;
}): GrowthCalendarDay[] {
  const firstWeekday = new Date(Date.UTC(input.year, input.month, 1)).getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(input.year, input.month + 1, 0)
  ).getUTCDate();
  const assessments = countByTokyoDate(input.assessmentDates);
  const upgrades = countByTokyoDate(
    input.levelChanges
      .filter(
        (change) =>
          isGrowthLevelChange(change.source) &&
          (change.fromLevel === null || change.toLevel > change.fromLevel)
      )
      .map((change) => change.changedAt)
  );
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) {
      return { dateKey: null, day: null, assessmentCount: 0, levelUpCount: 0 };
    }
    const dateKey = `${input.year}-${String(input.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return {
      dateKey,
      day,
      assessmentCount: assessments.get(dateKey) ?? 0,
      levelUpCount: upgrades.get(dateKey) ?? 0
    };
  });
}

export function calculateCategoryAverages(
  categories: ReadonlyArray<{ id: string; name: string }>,
  skills: ReadonlyArray<{ categoryId: string; level: number }>
) {
  return categories.map((category) => {
    const levels = skills
      .filter((skill) => skill.categoryId === category.id)
      .map((skill) => skill.level);
    const average = levels.length
      ? Math.round((levels.reduce((sum, level) => sum + level, 0) / levels.length) * 10) / 10
      : 0;
    return { ...category, average };
  });
}

export type MentorCandidate = {
  id: string;
  name: string;
  jobTitle: string | null;
  status: string;
  skills: ReadonlyArray<{ skillId: string; skillName: string; level: number }>;
};

export function findPotentialMentors(input: {
  memberId: string;
  targetGaps: ReadonlyArray<{ skillId: string; skillName: string }> | null;
  memberSkills: ReadonlyArray<{ skillId: string; skillName: string; level: number }>;
  candidates: ReadonlyArray<MentorCandidate>;
  limit?: number;
}) {
  const skillsToGrow = input.targetGaps === null
    ? [...input.memberSkills]
        .filter((skill) => skill.level < 4)
        .sort((left, right) => left.level - right.level || left.skillName.localeCompare(right.skillName, "ja"))
    : input.targetGaps.map((gap) => ({ ...gap, level: 0 }));
  const priority = new Map(
    skillsToGrow.map((skill, index) => [skill.skillId, index])
  );

  return input.candidates
    .filter((candidate) => candidate.id !== input.memberId && candidate.status === "ACTIVE")
    .flatMap((candidate) => {
      const match = candidate.skills
        .filter((skill) => skill.level >= 4 && priority.has(skill.skillId))
        .sort(
          (left, right) =>
            (priority.get(left.skillId) ?? 0) - (priority.get(right.skillId) ?? 0) ||
            right.level - left.level
        )[0];
      return match
        ? [{
            memberId: candidate.id,
            name: candidate.name,
            jobTitle: candidate.jobTitle,
            skillId: match.skillId,
            skillName: match.skillName,
            level: match.level,
            priority: priority.get(match.skillId) ?? 0
          }]
        : [];
    })
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        right.level - left.level ||
        left.name.localeCompare(right.name, "ja")
    )
    .slice(0, input.limit ?? 3)
    .map((mentor) => ({
      memberId: mentor.memberId,
      name: mentor.name,
      jobTitle: mentor.jobTitle,
      skillId: mentor.skillId,
      skillName: mentor.skillName,
      level: mentor.level
    }));
}

export function getTokyoDateParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

function getTokyoDateKey(value: Date | string) {
  const { year, month, day } = getTokyoDateParts(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getTokyoMonthKey(value: Date | string) {
  const { year, month } = getTokyoDateParts(value);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function countByTokyoDate(values: ReadonlyArray<Date | string>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = getTokyoDateKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function sortByDate<T>(values: ReadonlyArray<T>, key: keyof T) {
  return [...values].sort(
    (left, right) =>
      new Date(left[key] as Date | string).getTime() -
      new Date(right[key] as Date | string).getTime()
  );
}

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year: year!, month: month! };
}

function monthSerial(year: number, month: number) {
  return year * 12 + month;
}
