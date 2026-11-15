import { describe, expect, it } from "vitest";

import { matchesTargetRole } from "@/modules/members/application/member-service";

function member(targetRoleId: string | null, level?: number, recorded = false) {
  return {
    targetRoleId,
    targetRole: targetRoleId
      ? {
          roleRequirements: [
            {
              skillId: "skill-1",
              requiredLevel: 3,
              isRequired: true,
              anyOfGroup: null
            }
          ]
        }
      : null,
    roleAchievements: recorded && targetRoleId ? [{ roleId: targetRoleId }] : [],
    memberSkills: level === undefined ? [] : [{ skillId: "skill-1", level }]
  };
}

describe("matchesTargetRole", () => {
  it("keeps the existing unset, achieved, and in-progress decisions", () => {
    expect(matchesTargetRole(member(null), "unset")).toBe(true);
    expect(matchesTargetRole(member("role-1", 3, true), "achieved")).toBe(true);
    expect(matchesTargetRole(member("role-1", 2), "in_progress")).toBe(true);
    expect(matchesTargetRole(member("role-1", 3, true), "in_progress")).toBe(false);
  });
});
