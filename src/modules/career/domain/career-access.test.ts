import { describe, expect, it } from "vitest";

import { canAccessMemberCareer } from "./career-access";

describe("canAccessMemberCareer", () => {
  it.each([
    ["MEMBER", "self", "self", false, true],
    ["MEMBER", "viewer", "target", true, false],
    ["MANAGER", "viewer", "target", true, true],
    ["MANAGER", "viewer", "target", false, false],
    ["ADMIN", "viewer", "target", false, true]
  ] as const)("%s の閲覧可否を判定する", (role, viewerMemberId, targetMemberId, targetIsInScope, expected) => {
    expect(canAccessMemberCareer({ role, viewerMemberId, targetMemberId, targetIsInScope })).toBe(expected);
  });
});
