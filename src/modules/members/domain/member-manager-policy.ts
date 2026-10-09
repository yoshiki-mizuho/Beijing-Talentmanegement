export type ManagerAssignment = {
  id: string;
  managerId: string | null;
};

export function createsManagerCycle(
  memberId: string,
  managerId: string | null,
  assignments: readonly ManagerAssignment[]
) {
  if (managerId === null) {
    return false;
  }
  if (memberId === managerId) {
    return true;
  }

  const managerByMemberId = new Map(
    assignments.map((assignment) => [assignment.id, assignment.managerId])
  );
  const visited = new Set<string>();
  let currentManagerId: string | null = managerId;

  while (currentManagerId !== null && !visited.has(currentManagerId)) {
    if (currentManagerId === memberId) {
      return true;
    }
    visited.add(currentManagerId);
    currentManagerId = managerByMemberId.get(currentManagerId) ?? null;
  }

  return false;
}
