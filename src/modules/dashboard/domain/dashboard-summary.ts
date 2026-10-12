import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

export type OrganizationMember = {
  id: string;
  department: { id: string; name: string };
  targetRole: null | {
    id: string;
    name: string;
    roleRequirements: {
      skillId: string;
      requiredLevel: number;
      isRequired: boolean;
      skill: { name: string };
    }[];
  };
  memberSkills: { skillId: string; level: number }[];
};

export function buildOrganizationDashboard(input: {
  members: OrganizationMember[];
  levelChanges: {
    memberId: string;
    changedAt: Date;
    source: string;
    fromLevel: number | null;
    toLevel: number;
  }[];
  pendingAssessments: { memberId: string; createdAt: Date }[];
  now: Date;
}) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      input.now.getFullYear(),
      input.now.getMonth() - 5 + index,
      1,
    );
    return {
      date,
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: `${date.getMonth() + 1}月`,
    };
  });
  const changes = input.levelChanges.filter(
    (item) =>
      item.source !== "BACKFILL" && item.toLevel > (item.fromLevel ?? 0),
  );
  const monthlyLevelUps = months.map((month) => ({
    label: month.label,
    count: changes.filter(
      (item) =>
        `${item.changedAt.getFullYear()}-${item.changedAt.getMonth()}` ===
        month.key,
    ).length,
  }));
  const targets = input.members.filter((member) => member.targetRole);
  const isAchieved = (member: OrganizationMember) =>
    evaluateRoleAchievement(
      member.targetRole!.roleRequirements,
      member.memberSkills,
    ).achieved;
  const missing = new Map<
    string,
    { skillId: string; name: string; count: number }
  >();
  for (const member of targets) {
    const levels = new Map(
      member.memberSkills.map((skill) => [skill.skillId, skill.level]),
    );
    for (const requirement of member.targetRole!.roleRequirements.filter(
      (item) => item.isRequired,
    )) {
      if ((levels.get(requirement.skillId) ?? 0) < requirement.requiredLevel) {
        const item = missing.get(requirement.skillId) ?? {
          skillId: requirement.skillId,
          name: requirement.skill.name,
          count: 0,
        };
        item.count += 1;
        missing.set(requirement.skillId, item);
      }
    }
  }
  const staleBoundary = new Date(input.now.getTime() - 7 * 86400000);
  const departmentSummaries = [
    ...new Set(input.members.map((member) => member.department.id)),
  ].map((id) => {
    const members = input.members.filter(
      (member) => member.department.id === id,
    );
    const ids = new Set(members.map((member) => member.id));
    const departmentTargets = members.filter((member) => member.targetRole);
    return {
      id,
      name: members[0]?.department.name ?? "",
      memberCount: members.length,
      achievedRate: departmentTargets.length
        ? Math.round(
            (departmentTargets.filter(isAchieved).length /
              departmentTargets.length) *
              100,
          )
        : 0,
      levelUps: changes.filter(
        (item) => ids.has(item.memberId) && item.changedAt >= months[5].date,
      ).length,
      pending: input.pendingAssessments.filter((item) => ids.has(item.memberId))
        .length,
      stalePending: input.pendingAssessments.filter(
        (item) => ids.has(item.memberId) && item.createdAt <= staleBoundary,
      ).length,
    };
  });
  const roleSummaries = [
    ...new Set(targets.map((member) => member.targetRole!.id)),
  ].map((id) => {
    const members = targets.filter((member) => member.targetRole!.id === id);
    return {
      id,
      name: members[0]!.targetRole!.name,
      targetCount: members.length,
      achievedCount: members.filter(isAchieved).length,
    };
  });
  const current = monthlyLevelUps.at(-1)?.count ?? 0;
  const previous = monthlyLevelUps.at(-2)?.count ?? 0;
  return {
    memberCount: input.members.length,
    currentMonthLevelUps: current,
    monthOverMonth: current - previous,
    highLevelMembers: input.members.filter((member) =>
      member.memberSkills.some((skill) => skill.level >= 4),
    ).length,
    targetedCount: targets.length,
    achievedCount: targets.filter(isAchieved).length,
    pendingCount: input.pendingAssessments.length,
    stalePendingCount: input.pendingAssessments.filter(
      (item) => item.createdAt <= staleBoundary,
    ).length,
    monthlyLevelUps,
    missingSkills: [...missing.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    departmentSummaries,
    roleSummaries,
  };
}
