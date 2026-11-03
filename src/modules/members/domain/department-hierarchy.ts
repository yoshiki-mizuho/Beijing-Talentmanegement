export type DepartmentHierarchyItem = {
  id: string;
  name: string;
  parentDepartmentId: string | null;
};

export type DepartmentTreeItem = DepartmentHierarchyItem & {
  depth: number;
  pathLabel: string;
};

const japaneseNameCollator = new Intl.Collator("ja");

export function buildDepartmentTree(
  departments: DepartmentHierarchyItem[]
): DepartmentTreeItem[] {
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const cycleIds = findCycleIds(departments, departmentById);
  const childrenByParentId = new Map<string, DepartmentHierarchyItem[]>();
  const roots: DepartmentHierarchyItem[] = [];

  for (const department of departments) {
    const parentId = department.parentDepartmentId;
    if (!parentId || !departmentById.has(parentId) || cycleIds.has(department.id)) {
      roots.push(department);
      continue;
    }
    const children = childrenByParentId.get(parentId) ?? [];
    children.push(department);
    childrenByParentId.set(parentId, children);
  }

  const sortByName = (items: DepartmentHierarchyItem[]) =>
    items.sort((left, right) => japaneseNameCollator.compare(left.name, right.name));
  sortByName(roots);
  for (const children of childrenByParentId.values()) sortByName(children);

  const result: DepartmentTreeItem[] = [];
  const visited = new Set<string>();
  const visit = (department: DepartmentHierarchyItem, depth: number, path: string[]) => {
    if (visited.has(department.id)) return;
    visited.add(department.id);
    const nextPath = [...path, department.name];
    result.push({ ...department, depth, pathLabel: nextPath.join(" › ") });
    for (const child of childrenByParentId.get(department.id) ?? []) {
      visit(child, depth + 1, nextPath);
    }
  };

  for (const root of roots) visit(root, 0, []);
  for (const department of sortByName([...departments])) visit(department, 0, []);
  return result;
}

export function collectDescendantIds(
  departments: DepartmentHierarchyItem[],
  id: string
): string[] {
  const childrenByParentId = new Map<string, string[]>();
  for (const department of departments) {
    if (!department.parentDepartmentId) continue;
    const children = childrenByParentId.get(department.parentDepartmentId) ?? [];
    children.push(department.id);
    childrenByParentId.set(department.parentDepartmentId, children);
  }

  const result: string[] = [];
  const visited = new Set<string>();
  const visit = (departmentId: string) => {
    if (visited.has(departmentId)) return;
    visited.add(departmentId);
    result.push(departmentId);
    for (const childId of childrenByParentId.get(departmentId) ?? []) visit(childId);
  };
  visit(id);
  return result;
}

export function collectManagerVisibleDepartmentIds(
  departments: DepartmentHierarchyItem[],
  ownId: string
): string[] {
  const visibleIds = collectDescendantIds(departments, ownId);
  const ownDepartment = departments.find((department) => department.id === ownId);
  if (!ownDepartment?.parentDepartmentId) return visibleIds;

  const included = new Set(visibleIds);
  for (const department of departments) {
    if (
      department.parentDepartmentId === ownDepartment.parentDepartmentId &&
      !included.has(department.id)
    ) {
      visibleIds.push(department.id);
      included.add(department.id);
    }
  }
  return visibleIds;
}

function findCycleIds(
  departments: DepartmentHierarchyItem[],
  departmentById: Map<string, DepartmentHierarchyItem>
) {
  const cycleIds = new Set<string>();
  const completed = new Set<string>();

  for (const department of departments) {
    if (completed.has(department.id)) continue;
    const path: string[] = [];
    const pathIndexes = new Map<string, number>();
    let current: DepartmentHierarchyItem | undefined = department;
    while (current && !completed.has(current.id)) {
      const cycleStart = pathIndexes.get(current.id);
      if (cycleStart !== undefined) {
        for (const id of path.slice(cycleStart)) cycleIds.add(id);
        break;
      }
      pathIndexes.set(current.id, path.length);
      path.push(current.id);
      current = current.parentDepartmentId
        ? departmentById.get(current.parentDepartmentId)
        : undefined;
    }
    for (const id of path) completed.add(id);
  }
  return cycleIds;
}
