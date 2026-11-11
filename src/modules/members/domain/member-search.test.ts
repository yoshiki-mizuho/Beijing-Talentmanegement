import { describe, expect, it } from "vitest";

import {
  buildMemberListSearchParams,
  initialMemberListUrlState,
  memberSearchSchema,
  parseMemberListSearchParams
} from "@/modules/members/domain/member-search";

describe("memberSearchSchema", () => {
  it("coerces minLevel and accepts optional filters", () => {
    expect(
      memberSearchSchema.parse({
        q: "dev",
        minLevel: "3",
        status: "ACTIVE"
      })
    ).toEqual({
      q: "dev",
      minLevel: 3,
      status: "ACTIVE"
    });
  });

  it("rejects invalid levels", () => {
    expect(() => memberSearchSchema.parse({ minLevel: "6" })).toThrow();
  });

  it("treats an empty level query as omitted", () => {
    expect(memberSearchSchema.parse({ minLevel: "" })).toEqual({ minLevel: undefined });
  });
});

describe("member list URL state", () => {
  it("omits initial values", () => {
    expect(buildMemberListSearchParams(initialMemberListUrlState).toString()).toBe("");
  });

  it("round-trips filters, page and member", () => {
    const state = parseMemberListSearchParams(
      new URLSearchParams(
        "q=dev&departmentId=dep-1&skillId=skill-1&minLevel=3&roleId=role-1&status=LEAVE&targetRole=achieved&page=2&member=member-1"
      )
    );

    expect(buildMemberListSearchParams(state).toString()).toBe(
      "q=dev&departmentId=dep-1&skillId=skill-1&minLevel=3&roleId=role-1&status=LEAVE&targetRole=achieved&page=2&member=member-1"
    );
  });

  it("falls back from invalid values", () => {
    expect(
      parseMemberListSearchParams(
        new URLSearchParams("minLevel=9&status=UNKNOWN&targetRole=other&page=0")
      )
    ).toEqual(initialMemberListUrlState);
  });

  it("accepts only positive integer pages", () => {
    expect(parseMemberListSearchParams(new URLSearchParams("page=3")).page).toBe(3);
    expect(parseMemberListSearchParams(new URLSearchParams("page=1.5")).page).toBe(1);
    expect(parseMemberListSearchParams(new URLSearchParams("page=-1")).page).toBe(1);
  });
});
