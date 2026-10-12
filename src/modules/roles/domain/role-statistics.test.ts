import { describe, expect, it } from "vitest";
import { calculateRoleStatistics } from "@/modules/roles/domain/role-statistics";

describe("calculateRoleStatistics", () => {
  it("counts active achievers and active target members", () => {
    expect(calculateRoleStatistics("role-1", [{ skillId: "skill-1", requiredLevel: 3, isRequired: true }], [
      { status: "ACTIVE", targetRoleId: "role-1", memberSkills: [{ skillId: "skill-1", level: 3 }] },
      { status: "ACTIVE", targetRoleId: "role-1", memberSkills: [] },
      { status: "ACTIVE", targetRoleId: null, memberSkills: [{ skillId: "skill-1", level: 4 }] },
      { status: "INACTIVE", targetRoleId: "role-1", memberSkills: [{ skillId: "skill-1", level: 5 }] }
    ])).toEqual({ achievedCount: 2, targetCount: 2 });
  });
});
