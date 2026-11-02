export type SkillOrderCategory = {
  id: string;
  skillIds: string[];
};

export const categoryKey = (id: string) => `category:${id}`;
export const containerKey = (id: string) => `container:${id}`;
export const skillKey = (id: string) => `skill:${id}`;

export function buildSkillOrder(
  categories: Array<{ id: string }>,
  skills: Array<{ id: string; categoryId: string }>,
): SkillOrderCategory[] {
  return categories.map((category) => ({
    id: category.id,
    skillIds: skills
      .filter((skill) => skill.categoryId === category.id)
      .map((skill) => skill.id),
  }));
}

export function findCategoryId(order: SkillOrderCategory[], itemKey: string) {
  if (itemKey.startsWith("category:")) return itemKey.slice("category:".length);
  if (itemKey.startsWith("container:"))
    return itemKey.slice("container:".length);
  const skillId = itemKey.slice("skill:".length);
  return order.find((category) => category.skillIds.includes(skillId))?.id;
}

export function moveSkillOrder(
  order: SkillOrderCategory[],
  activeKey: string,
  overKey: string,
): SkillOrderCategory[] {
  const activeId = activeKey.slice("skill:".length);
  const fromCategoryId = findCategoryId(order, activeKey);
  const toCategoryId = findCategoryId(order, overKey);
  if (!fromCategoryId || !toCategoryId) return order;
  const sourceSkillIds =
    order.find((category) => category.id === fromCategoryId)?.skillIds ?? [];
  const activeIndex = sourceSkillIds.indexOf(activeId);
  const originalOverIndex = overKey.startsWith("skill:")
    ? sourceSkillIds.indexOf(overKey.slice("skill:".length))
    : -1;

  const withoutActive = order.map((category) => ({
    ...category,
    skillIds: category.skillIds.filter((id) => id !== activeId),
  }));
  return withoutActive.map((category) => {
    if (category.id !== toCategoryId) return category;
    const next = [...category.skillIds];
    const overId = overKey.startsWith("skill:")
      ? overKey.slice("skill:".length)
      : null;
    let insertAt = overId ? next.indexOf(overId) : next.length;
    if (fromCategoryId === toCategoryId && activeIndex < originalOverIndex)
      insertAt += 1;
    next.splice(insertAt < 0 ? next.length : insertAt, 0, activeId);
    return { ...category, skillIds: next };
  });
}

export function moveCategoryOrder(
  order: SkillOrderCategory[],
  activeKey: string,
  overKey: string,
): SkillOrderCategory[] {
  const from = order.findIndex(
    (category) => categoryKey(category.id) === activeKey,
  );
  const to = order.findIndex(
    (category) => categoryKey(category.id) === overKey,
  );
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function toSkillOrderPayload(order: SkillOrderCategory[]) {
  return {
    categories: order.map((category) => ({
      categoryId: category.id,
      skillIds: category.skillIds,
    })),
  };
}
