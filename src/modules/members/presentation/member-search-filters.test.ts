import { describe, expect, it } from "vitest";

import {
  buildMemberSearchParams,
  emptyMemberSearchFilters,
  hasMemberSearchFilters,
  type MemberSearchFilters
} from "@/modules/members/presentation/member-search-filters";

const filterCases: Array<[keyof MemberSearchFilters, string]> = [
  ["q", "佐藤"],
  ["departmentId", "department-1"],
  ["skillId", "skill-1"],
  ["minLevel", "3"],
  ["roleId", "role-1"],
  ["status", "ACTIVE"]
];

describe("member search filters", () => {
  it.each(filterCases)("serializes %s", (key, value) => {
    const params = buildMemberSearchParams({
      ...emptyMemberSearchFilters,
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

  it("omits empty filters", () => {
    expect(buildMemberSearchParams(emptyMemberSearchFilters).toString()).toBe("");
    expect(hasMemberSearchFilters(emptyMemberSearchFilters)).toBe(false);
  });
});
