import type { BadgeId } from "@/modules/growth/domain/badge-art";

const TOKYO_TIME_ZONE = "Asia/Tokyo";

type DatedValue = { createdAt: Date | string };

export type GrowthLevelChange = {
  skillId: string;
  fromLevel: number | null;
  toLevel: number;
  source: string;
  changedAt: Date | string;
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
  assessments: ReadonlyArray<DatedValue>;
  memberSkills: ReadonlyArray<{ skillId: string; level: number }>;
  levelChanges: ReadonlyArray<GrowthLevelChange>;
  targetRequirements: ReadonlyArray<{ skillId: string; requiredLevel: number }>;
  mentoredCheers: ReadonlyArray<{ toMemberId: string; createdAt: Date | string }>;
}): BadgeAchievement[] {
  const assessments = sortByDate(input.assessments, "createdAt");
  const changes = sortByDate(input.levelChanges, "changedAt");
  const newSkillChanges = changes.filter((change) => change.fromLevel === null);
  const skillLevels = new Map(
    input.memberSkills.map((skill) => [skill.skillId, skill.level])
  );
  const targetAchieved =
    input.targetRequirements.length > 0 &&
    input.targetRequirements.every(
      (requirement) =>
        (skillLevels.get(requirement.skillId) ?? 0) >= requirement.requiredLevel
    );
  const targetSkillIds = new Set(
    input.targetRequirements.map((requirement) => requirement.skillId)
  );
  const targetChangedAt = targetAchieved
    ? findTargetAchievementDate(input.targetRequirements, changes, targetSkillIds)
    : null;
  const uniqueMentees = new Set<string>();
  let thirdMenteeAt: Date | string | null = null;
  for (const cheer of sortByDate(input.mentoredCheers, "createdAt")) {
    uniqueMentees.add(cheer.toMemberId);
    if (uniqueMentees.size === 3) {
      thirdMenteeAt = cheer.createdAt;
      break;
    }
  }

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
    achievement("rubber-duck", thirdMenteeAt)
  ];
}

function achievement(id: BadgeId, value: Date | string | null | undefined) {
  return { id, earnedAt: value ? new Date(value) : null };
}

function findThreeMonthStreakDate(changes: ReadonlyArray<GrowthLevelChange>) {
  const upgrades = changes.filter(
    (change) =>
      change.source !== "BACKFILL" &&
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

function findTargetAchievementDate(
  requirements: ReadonlyArray<{ skillId: string; requiredLevel: number }>,
  changes: ReadonlyArray<GrowthLevelChange>,
  targetSkillIds: ReadonlySet<string>
) {
  const knownLevels = new Map<string, number>();
  const relevantChanges = changes.filter((change) =>
    targetSkillIds.has(change.skillId)
  );
  for (const change of relevantChanges) {
    knownLevels.set(change.skillId, change.toLevel);
    if (
      requirements.every(
        (requirement) =>
          (knownLevels.get(requirement.skillId) ?? 0) >= requirement.requiredLevel
      )
    ) {
      return change.changedAt;
    }
  }
  return relevantChanges.at(-1)?.changedAt ?? null;
}

export type GrowthCalendarDay = {
  dateKey: string | null;
  day: number | null;
  assessmentCount: number;
  levelUpCount: number;
};

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
          change.source !== "BACKFILL" &&
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

function getTokyoMonthKey(value: Date | string) {
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
