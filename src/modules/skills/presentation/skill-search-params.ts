export type SkillSearchFilters = {
  q: string;
  categoryId: string;
  isActive: string;
};

export const emptySkillSearchFilters: SkillSearchFilters = {
  q: "",
  categoryId: "",
  isActive: ""
};

export function buildSkillSearchParams(filters: SkillSearchFilters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) {
      searchParams.set(key, value.trim());
    }
  });

  return searchParams;
}
