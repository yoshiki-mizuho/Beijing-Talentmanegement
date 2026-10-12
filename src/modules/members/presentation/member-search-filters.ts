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
  status: "ACTIVE"
};

export const MEMBER_PAGE_SIZE = 20;

export function getMemberPageRange(total: number, page: number) {
  const pageCount = Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = total === 0 ? 0 : (currentPage - 1) * MEMBER_PAGE_SIZE + 1;
  const end = Math.min(currentPage * MEMBER_PAGE_SIZE, total);

  return { currentPage, pageCount, start, end };
}

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
