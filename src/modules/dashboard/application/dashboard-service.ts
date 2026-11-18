import type { AuthRole } from "@prisma/client";
import {
  buildDepartmentTree,
  collectDescendantIds,
} from "@/modules/members/domain/department-hierarchy";
import {
  buildDepartmentMetrics,
  comparisonDepartmentIds,
  dashboardMemberDepartmentIds,
  dashboardVisibleDepartmentIds,
  departmentMemberIds,
  groupLevelChangesByMember,
  organizationDashboardChangesSince,
  selectDepartmentId,
} from "@/modules/dashboard/domain/organization-dashboard";
import { buildOrganizationDashboard } from "@/modules/dashboard/domain/dashboard-summary";
import {
  getOrganizationDashboardScope,
  getOrganizationDashboardSource,
} from "@/modules/dashboard/infrastructure/dashboard-repository";
import { listRoleAchievements } from "@/modules/roles/application/role-achievement-service";

export async function getDashboardSummary(
  role: AuthRole,
  memberId: string,
  departmentId?: string,
) {
  const now = new Date();
  const scope = await getOrganizationDashboardScope(memberId);
  const tree = buildDepartmentTree(scope.departments);
  const visibleIds = dashboardVisibleDepartmentIds(
    role,
    scope.departments,
    scope.viewer.departmentId,
  );
  const source = await getOrganizationDashboardSource({
    departmentIds:
      role === "ADMIN"
        ? undefined
        : dashboardMemberDepartmentIds(scope.departments, visibleIds),
    changesSince: organizationDashboardChangesSince(now),
  });
  const roleAchievements = await listRoleAchievements({
    memberIds: source.members.map((member) => member.id)
  });
  const achievementsByMember = new Map<string, typeof roleAchievements>();
  for (const achievement of roleAchievements) {
    const achievements = achievementsByMember.get(achievement.memberId) ?? [];
    achievements.push(achievement);
    achievementsByMember.set(achievement.memberId, achievements);
  }
  const sourceMembers = source.members.map((member) => ({
    ...member,
    roleAchievements: achievementsByMember.get(member.id) ?? [],
  }));
  const changesByMember = groupLevelChangesByMember(source.changes);
  const roots = tree.filter((item) => item.depth === 0);
  const fallback =
    role === "ADMIN"
      ? roots.length === 1
        ? roots[0].id
        : null
      : scope.viewer.departmentId;
  const selectedId = selectDepartmentId(departmentId, visibleIds, fallback);
  const selectedDepartment = selectedId
    ? tree.find((item) => item.id === selectedId)
    : null;
  const memberIds = new Set(
    departmentMemberIds(scope.departments, sourceMembers, selectedId),
  );
  const members = sourceMembers.filter((member) => memberIds.has(member.id));
  const changes = source.changes.filter((change) =>
    memberIds.has(change.memberId),
  );
  const comparisonIds = selectedId
    ? comparisonDepartmentIds(scope.departments, selectedId, visibleIds)
    : roots.map((item) => item.id);
  const comparisons = comparisonIds.map((id) => {
    const ids = new Set(
      departmentMemberIds(scope.departments, sourceMembers, id),
    );
    const comparisonMembers = sourceMembers.filter((member) =>
      ids.has(member.id),
    );
    return {
      id,
      name: tree.find((item) => item.id === id)?.name ?? "",
      ...buildDepartmentMetrics({
        members: comparisonMembers,
        changes: comparisonMembers.flatMap(
          (member) => changesByMember.get(member.id) ?? [],
        ),
        changesByMember,
        now,
      }),
    };
  });
  const summary = buildOrganizationDashboard({
    members: members.map((member) => ({
      ...member,
      department: {
        id: member.departmentId,
        name: tree.find((item) => item.id === member.departmentId)?.name ?? "",
      },
    })),
    levelChanges: changes,
    pendingAssessments: [],
    now,
  });
  const directCounts = new Map(
    scope.memberCounts.map((item) => [item.departmentId, item._count._all]),
  );
  const counts = new Map(
    tree.map((item) => {
      const ids = collectDescendantIds(scope.departments, item.id);
      return [
        item.id,
        ids.reduce((sum, id) => sum + (directCounts.get(id) ?? 0), 0),
      ];
    }),
  );
  return {
    scope: {
      name: selectedDepartment?.name ?? "全社",
      departmentId: selectedId,
      pathLabel: selectedDepartment?.pathLabel ?? "全社",
      memberCount: members.length,
    },
    showCompany: role === "ADMIN" && roots.length > 1,
    tree: tree.map((item) => ({
      ...item,
      visible: visibleIds.includes(item.id),
      memberCount: counts.get(item.id) ?? 0,
      own: item.id === scope.viewer.departmentId,
    })),
    metrics: buildDepartmentMetrics({ members, changes, changesByMember, now }),
    comparisons,
    comparisonMode:
      selectedId &&
      scope.departments.some(
        (item) =>
          item.parentDepartmentId === selectedId &&
          visibleIds.includes(item.id),
      )
        ? ("children" as const)
        : ("siblings" as const),
    summary,
  };
}
