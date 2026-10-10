export type TeamMemberSnapshot = {
  id: string;
  name: string;
  createdAt: Date;
  targetRole: {
    name: string;
    roleRequirements: {
      skillId: string;
      skillName: string;
      requiredLevel: number;
    }[];
  } | null;
  memberSkills: { skillId: string; level: number }[];
  pendingAssessments: { skillId: string }[];
  assessmentDates: Date[];
  levelChangeDates: Date[];
};

export type MonthRange = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  previousStart: Date;
};

const millisecondsPerDay = 86_400_000;

export function parseDashboardMonth(
  value: string | undefined,
  now: Date = new Date()
): MonthRange {
  const current = getTokyoDateParts(now);
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");
  const year = match ? Number(match[1]) : current.year;
  const month = match ? Number(match[2]) : current.month;
  const start = tokyoMonthStart(year, month);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: `${year}年${month}月`,
    start,
    end: tokyoMonthStart(next.year, next.month),
    previousStart: tokyoMonthStart(previous.year, previous.month)
  };
}

export function shiftDashboardMonth(key: string, amount: -1 | 1) {
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getTeamGrowthMessage(levelUpCount: number) {
  if (levelUpCount === 0) {
    return "次の一歩を記録できるよう、チームの挑戦を見守りましょう。";
  }
  if (levelUpCount === 1) {
    return "新しい成長が生まれています。チームでお祝いしましょう。";
  }
  if (levelUpCount <= 4) {
    return `${levelUpCount}件の前進が生まれています。小さな成長もチームの力になります。`;
  }
  return `${levelUpCount}件のレベルアップがありました。挑戦が広がるひと月です。`;
}

export function buildMonthComparison(currentCount: number, previousCount: number) {
  if (previousCount === 0) {
    return currentCount === 0 ? "先月と同じ" : `先月より${currentCount}件増`;
  }
  const difference = currentCount - previousCount;
  if (difference === 0) return "先月と同じ";
  return `先月より${Math.abs(difference)}件${difference > 0 ? "増" : "減"}`;
}

export function findAlmostThereMembers(members: TeamMemberSnapshot[]) {
  return members.flatMap((member) => {
    if (!member.targetRole) return [];
    const levels = new Map(member.memberSkills.map((skill) => [skill.skillId, skill.level]));
    const gaps = member.targetRole.roleRequirements.filter(
      (requirement) => (levels.get(requirement.skillId) ?? 0) < requirement.requiredLevel
    );
    if (gaps.length !== 1) return [];
    const gap = gaps[0];
    return [{
      memberId: member.id,
      memberName: member.name,
      roleName: member.targetRole.name,
      skillName: gap.skillName,
      currentLevel: levels.get(gap.skillId) ?? 0,
      requiredLevel: gap.requiredLevel,
      pending: member.pendingAssessments.some((assessment) => assessment.skillId === gap.skillId)
    }];
  });
}

export function findInactiveMembers(
  members: TeamMemberSnapshot[],
  now: Date = new Date(),
  minimumDays = 60
) {
  return members.flatMap((member) => {
    const activityDates = [
      ...member.assessmentDates,
      ...member.levelChangeDates
    ];
    const lastUpdatedAt = activityDates.length > 0
      ? new Date(Math.max(...activityDates.map((date) => date.getTime())))
      : member.createdAt;
    const daysAgo = Math.max(
      0,
      Math.floor((now.getTime() - lastUpdatedAt.getTime()) / millisecondsPerDay)
    );
    return daysAgo >= minimumDays
      ? [{
          memberId: member.id,
          memberName: member.name,
          lastUpdatedAt,
          daysAgo,
          targetRoleUnset: member.targetRole === null
        }]
      : [];
  }).sort((left, right) => right.daysAgo - left.daysAgo);
}

export function aggregateMissingSkills(members: TeamMemberSnapshot[]) {
  const counts = new Map<string, { skillId: string; skillName: string; count: number }>();
  for (const member of members) {
    if (!member.targetRole) continue;
    const levels = new Map(member.memberSkills.map((skill) => [skill.skillId, skill.level]));
    for (const requirement of member.targetRole.roleRequirements) {
      if ((levels.get(requirement.skillId) ?? 0) >= requirement.requiredLevel) continue;
      const current = counts.get(requirement.skillId);
      counts.set(requirement.skillId, {
        skillId: requirement.skillId,
        skillName: requirement.skillName,
        count: (current?.count ?? 0) + 1
      });
    }
  }
  return [...counts.values()].sort(
    (left, right) => right.count - left.count || left.skillName.localeCompare(right.skillName, "ja")
  );
}

export function hasAchievedTargetRole(member: TeamMemberSnapshot) {
  if (!member.targetRole || member.targetRole.roleRequirements.length === 0) return false;
  const levels = new Map(member.memberSkills.map((skill) => [skill.skillId, skill.level]));
  return member.targetRole.roleRequirements.every(
    (requirement) => (levels.get(requirement.skillId) ?? 0) >= requirement.requiredLevel
  );
}

function tokyoMonthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, -9));
}

function getTokyoDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric"
  }).formatToParts(value);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value)
  };
}
