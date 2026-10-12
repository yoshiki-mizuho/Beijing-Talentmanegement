import { describe, expect, it } from "vitest";

import {
  buildMemberSearchParams,
  emptyMemberSearchFilters,
  getMemberPageRange,
  hasMemberSearchFilters,
  type MemberSearchFilters
} from "@/modules/members/presentation/member-search-filters";

const filterCases: Array<[keyof MemberSearchFilters, string]> = [
  ["q", "佐藤"],
  ["departmentId", "department-1"],
  ["skillId", "skill-1"],
  ["minLevel", "3"],
  ["roleId", "role-1"],
  ["status", "LEAVE"]
];

describe("member search filters", () => {
  it.each(filterCases)("serializes %s", (key, value) => {
    const params = buildMemberSearchParams({
      ...emptyMemberSearchFilters,
      status: "",
      [key]: value
    });

    expect(params.get(key)).toBe(value);
    expect([...params.keys()]).toEqual([key]);
  });

  it("serializes all filters for a compound search", () => {
    const filters: MemberSearchFilters = {
      q: "engineer",
      departmentId: "department-1",
      skillId: "skill-1",
      minLevel: "4",
      roleId: "role-1",
      status: "ACTIVE"
    };

    expect(Object.fromEntries(buildMemberSearchParams(filters))).toEqual(filters);
    expect(hasMemberSearchFilters(filters)).toBe(true);
  });

  it("defaults to active members and clear restores that default", () => {
    expect(emptyMemberSearchFilters.status).toBe("ACTIVE");
    expect(buildMemberSearchParams(emptyMemberSearchFilters).toString()).toBe("status=ACTIVE");
    expect(hasMemberSearchFilters(emptyMemberSearchFilters)).toBe(true);
  });

  it("calculates 20-item page ranges", () => {
    expect(getMemberPageRange(45, 1)).toEqual({ currentPage: 1, pageCount: 3, start: 1, end: 20 });
    expect(getMemberPageRange(45, 3)).toEqual({ currentPage: 3, pageCount: 3, start: 41, end: 45 });
    expect(getMemberPageRange(0, 1)).toEqual({ currentPage: 1, pageCount: 1, start: 0, end: 0 });
  });
});
