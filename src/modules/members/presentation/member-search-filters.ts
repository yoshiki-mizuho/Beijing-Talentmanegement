export type MemberSearchFilters = {
  q: string;
  departmentId: string;
  skillId: string;
  minLevel: string;
  roleId: string;
  status: string;
};

export const emptyMemberSearchFilters: MemberSearchFilters = {
  q: "",
  departmentId: "",
  skillId: "",
  minLevel: "",
  roleId: "",
  status: ""
};

export function hasMemberSearchFilters(filters: MemberSearchFilters) {
  return Object.values(filters).some(Boolean);
}

export function buildMemberSearchParams(filters: MemberSearchFilters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  return searchParams;
}
