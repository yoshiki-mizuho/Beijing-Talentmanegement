import type { AuthRole } from "@prisma/client";
import {
  buildDepartmentTree,
  collectDescendantIds,
  collectManagerVisibleDepartmentIds,
} from "@/modules/members/domain/department-hierarchy";
import {
  buildDepartmentMetrics,
  comparisonDepartmentIds,
  departmentMemberIds,
  selectDepartmentId,
} from "@/modules/dashboard/domain/organization-dashboard";
import { buildOrganizationDashboard } from "@/modules/dashboard/domain/dashboard-summary";
import { getOrganizationDashboardSource } from "@/modules/dashboard/infrastructure/dashboard-repository";
import { listRoleAchievements } from "@/modules/roles/application/role-achievement-service";

export async function getDashboardSummary(
  role: AuthRole,
  memberId: string,
  departmentId?: string,
) {
  const source = await getOrganizationDashboardSource(memberId);
  const roleAchievements = await listRoleAchievements({
    memberIds: source.members.map((member) => member.id)
  });
  const sourceMembers = source.members.map((member) => ({
    ...member,
    roleAchievements: roleAchievements.filter(
      (achievement) => achievement.memberId === member.id
    )
  }));
  const tree = buildDepartmentTree(source.departments);
  const visibleIds =
    role === "ADMIN"
      ? tree.map((item) => item.id)
      : collectManagerVisibleDepartmentIds(
          source.departments,
          source.viewer.departmentId,
        );
  const roots = tree.filter((item) => item.depth === 0);
  const fallback =
    role === "ADMIN"
      ? roots.length === 1
        ? roots[0].id
        : null
      : source.viewer.departmentId;
  const selectedId = selectDepartmentId(departmentId, visibleIds, fallback);
  const selectedDepartment = selectedId
    ? tree.find((item) => item.id === selectedId)
    : null;
  const memberIds = new Set(
    departmentMemberIds(source.departments, sourceMembers, selectedId),
  );
  const members = sourceMembers.filter((member) => memberIds.has(member.id));
  const changes = source.changes.filter((change) =>
    memberIds.has(change.memberId),
  );
  const now = new Date();
  const comparisonIds = selectedId
    ? comparisonDepartmentIds(source.departments, selectedId, visibleIds)
    : roots.map((item) => item.id);
  const comparisons = comparisonIds.map((id) => {
    const ids = new Set(
      departmentMemberIds(source.departments, sourceMembers, id),
    );
    const comparisonMembers = sourceMembers.filter((member) =>
      ids.has(member.id),
    );
    return {
      id,
      name: tree.find((item) => item.id === id)?.name ?? "",
      ...buildDepartmentMetrics({
        members: comparisonMembers,
        changes: source.changes.filter((change) => ids.has(change.memberId)),
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
  const counts = new Map(
    tree.map((item) => {
      const ids = new Set(collectDescendantIds(source.departments, item.id));
      return [
        item.id,
        sourceMembers.filter((member) => ids.has(member.departmentId)).length,
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
      own: item.id === source.viewer.departmentId,
    })),
    metrics: buildDepartmentMetrics({ members, changes, now }),
    comparisons,
    comparisonMode:
      selectedId &&
      source.departments.some(
        (item) =>
          item.parentDepartmentId === selectedId &&
          visibleIds.includes(item.id),
      )
        ? ("children" as const)
        : ("siblings" as const),
    summary,
  };
}
