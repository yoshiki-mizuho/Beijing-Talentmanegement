export type NodeHierarchyItem = {
  id: string;
  name: string;
  parentId: string | null;
};

export function collectDescendantNodeIds(nodes: NodeHierarchyItem[], id: string) {
  const childrenByParentId = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const children = childrenByParentId.get(node.parentId) ?? [];
    children.push(node.id);
    childrenByParentId.set(node.parentId, children);
  }
  const result: string[] = [];
  const visited = new Set<string>();
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    result.push(nodeId);
    for (const childId of childrenByParentId.get(nodeId) ?? []) visit(childId);
  };
  visit(id);
  return result;
}

export function collectManagerVisibleNodeIds(nodes: NodeHierarchyItem[], ownId: string) {
  const visibleIds = collectDescendantNodeIds(nodes, ownId);
  const ownNode = nodes.find((node) => node.id === ownId);
  if (!ownNode?.parentId) return visibleIds;
  const included = new Set(visibleIds);
  for (const node of nodes) {
    if (node.parentId === ownNode.parentId && !included.has(node.id)) {
      visibleIds.push(node.id);
      included.add(node.id);
    }
  }
  return visibleIds;
}
