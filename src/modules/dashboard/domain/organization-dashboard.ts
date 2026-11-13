import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import { isGrowthLevelChange } from "@/modules/growth/domain/level-change-source";
import {
  collectDescendantIds,
  type DepartmentHierarchyItem,
} from "@/modules/members/domain/department-hierarchy";

export type Momentum = "accelerating" | "steady" | "slowing";
export type OrganizationLevelChange = {
  memberId: string;
  skillId: string;
  changedAt: Date;
  source: string;
  fromLevel: number | null;
  toLevel: number;
  categoryName: string;
};
export type OrganizationDashboardMember = {
  id: string;
  departmentId: string;
  memberSkills: { skillId: string; level: number }[];
  targetRole: null | {
    id: string;
    name: string;
    roleRequirements: {
      skillId: string;
      requiredLevel: number;
      isRequired: boolean;
      anyOfGroup?: number | null;
      skill: { name: string };
    }[];
  };
  roleAchievements?: { roleId: string; achievedAt: Date }[];
};

export function completedMonths(now: Date, count = 12) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index, 1);
    return {
      date,
      end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: `${date.getMonth() + 1}月`,
    };
  });
}

export function momentumFor(recent: number, previous: number) {
  const ratio =
    previous === 0 ? (recent > 0 ? null : 100) : (recent / previous) * 100;
  const momentum: Momentum =
    previous === 0 && recent > 0
      ? "accelerating"
      : (ratio ?? 100) >= 110
        ? "accelerating"
        : (ratio ?? 100) <= 90
          ? "slowing"
          : "steady";
  return { momentum, ratio: previous === 0 ? null : Math.round(ratio ?? 0) };
}

export function perPersonLevelUps(total: number, memberCount: number) {
  return memberCount ? Math.round((total / 3 / memberCount) * 100) / 100 : null;
}

export function selectDepartmentId(
  requested: string | undefined,
  visibleIds: string[],
  fallback: string | null,
) {
  return requested && visibleIds.includes(requested) ? requested : fallback;
}

export function comparisonDepartmentIds(
  departments: DepartmentHierarchyItem[],
  selectedId: string,
  visibleIds: string[],
) {
  const visible = new Set(visibleIds);
  const children = departments.filter(
    (item) => item.parentDepartmentId === selectedId && visible.has(item.id),
  );
  if (children.length) return children.map((item) => item.id);
  const selected = departments.find((item) => item.id === selectedId);
  return departments
    .filter(
      (item) =>
        item.parentDepartmentId === selected?.parentDepartmentId &&
        visible.has(item.id),
    )
    .map((item) => item.id);
}

export function restoreSkillsAt(
  member: OrganizationDashboardMember,
  changes: OrganizationLevelChange[],
  at: Date,
) {
  const levels = new Map(
    member.memberSkills.map((item) => [item.skillId, item.level]),
  );
  changes
    .filter((item) => item.memberId === member.id && item.changedAt > at)
    .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
    .forEach((item) =>
      item.fromLevel === null
        ? levels.delete(item.skillId)
        : levels.set(item.skillId, item.fromLevel),
    );
  return [...levels].map(([skillId, level]) => ({ skillId, level }));
}

export function cumulativeCategories(
  changes: OrganizationLevelChange[],
  monthStarts: Date[],
) {
  const counts = new Map<string, number>();
  changes.forEach((item) =>
    counts.set(item.categoryName, (counts.get(item.categoryName) ?? 0) + 1),
  );
  const top = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);
  const hasOther = counts.size > 4;
  const categories = hasOther ? [...top, "その他"] : top;
  const running = new Map(categories.map((name) => [name, 0]));
  return {
    categories,
    series: monthStarts.map((date) => {
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      changes
        .filter((item) => item.changedAt >= date && item.changedAt < end)
        .forEach((item) => {
          const name = top.includes(item.categoryName)
            ? item.categoryName
            : "その他";
          if (running.has(name))
            running.set(name, (running.get(name) ?? 0) + 1);
        });
      return Object.fromEntries(running);
    }),
  };
}

export function buildDepartmentMetrics(input: {
  members: OrganizationDashboardMember[];
  changes: OrganizationLevelChange[];
  now: Date;
}) {
  const months = completedMonths(input.now);
  const start = months[0].date;
  const end = months.at(-1)!.end;
  const growth = input.changes.filter(
    (item) =>
      item.changedAt >= start &&
      item.changedAt < end &&
      isGrowthLevelChange(item.source) &&
      item.toLevel > (item.fromLevel ?? 0),
  );
  const monthly = months.map((month) => ({
    label: month.label,
    count: growth.filter(
      (item) => item.changedAt >= month.date && item.changedAt < month.end,
    ).length,
  }));
  const recent = monthly.slice(-3).reduce((sum, item) => sum + item.count, 0);
  const previous = monthly
    .slice(-6, -3)
    .reduce((sum, item) => sum + item.count, 0);
  const momentum = momentumFor(recent, previous);
  const yearAgo = new Date(
    input.now.getFullYear() - 1,
    input.now.getMonth(),
    input.now.getDate(),
  );
  const threeMonthsAgo = new Date(
    input.now.getFullYear(),
    input.now.getMonth() - 3,
    input.now.getDate(),
  );
  const targetMembers = input.members.filter((member) => member.targetRole);
  const evaluation = (
    member: OrganizationDashboardMember,
    skills: { skillId: string; level: number }[],
  ) => evaluateRoleAchievement(member.targetRole!.roleRequirements, skills);
  const achievedCount = targetMembers.filter(
    (member) => (member.roleAchievements ?? []).some(
      (achievement) => achievement.roleId === member.targetRole?.id
    ),
  ).length;
  const achievedYearAgo = targetMembers.filter(
    (member) => (member.roleAchievements ?? []).some(
      (achievement) =>
        achievement.roleId === member.targetRole?.id &&
        achievement.achievedAt <= yearAgo
    ),
  ).length;
  const average = (at?: Date) =>
    targetMembers.length
      ? Math.round(
          (targetMembers.reduce(
            (sum, member) =>
              sum +
              evaluation(
                member,
                at
                  ? restoreSkillsAt(member, input.changes, at)
                  : member.memberSkills,
              ).achievementRate,
            0,
          ) /
            targetMembers.length) *
            100,
        )
      : null;
  return {
    memberCount: input.members.length,
    monthly,
    recent,
    previous,
    ...momentum,
    perPerson: perPersonLevelUps(recent, input.members.length),
    achievedCount,
    achievedYearAgo,
    averageProgress: average(),
    progressThreeMonthsAgo: average(threeMonthsAgo),
    categories: cumulativeCategories(
      growth,
      months.map((item) => item.date),
    ),
  };
}

export function departmentMemberIds(
  departments: DepartmentHierarchyItem[],
  members: OrganizationDashboardMember[],
  id: string | null,
) {
  if (!id) return members.map((member) => member.id);
  const ids = new Set(collectDescendantIds(departments, id));
  return members
    .filter((member) => ids.has(member.departmentId))
    .map((member) => member.id);
}
