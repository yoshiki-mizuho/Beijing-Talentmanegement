import { describe, expect, it } from "vitest";

import { selectNewRoleAchievements } from "@/modules/roles/domain/role-achievement-record";

const achievedAt = new Date("2026-11-13T00:00:00.000Z");

function candidate(overrides: { isActive?: boolean; targetRoleId?: string | null } = {}) {
  return {
    memberId: "member-1",
    targetRoleId: overrides.targetRoleId ?? null,
    memberSkills: [{ skillId: "skill-1", level: 3 }],
    role: {
      id: "role-1",
      isActive: overrides.isActive ?? true,
      requirements: [{
        skillId: "skill-1",
        skillName: "設計",
        requiredLevel: 2,
        isRequired: true,
        anyOfGroup: null
      }]
    }
  };
}

describe("selectNewRoleAchievements", () => {
  it("returns only achieved combinations without an existing record", () => {
    expect(selectNewRoleAchievements([candidate()], new Set(), achievedAt)).toHaveLength(1);
    expect(selectNewRoleAchievements(
      [candidate()],
      new Set(["member-1:role-1"]),
      achievedAt
    )).toEqual([]);
    const notAchieved = candidate();
    notAchieved.memberSkills[0].level = 1;
    expect(selectNewRoleAchievements([notAchieved], new Set(), achievedAt)).toEqual([]);
  });

  it("excludes inactive roles", () => {
    expect(selectNewRoleAchievements(
      [candidate({ isActive: false })],
      new Set(),
      achievedAt
    )).toEqual([]);
  });

  it("sets celebration fields from whether the role is the target", () => {
    const target = selectNewRoleAchievements(
      [candidate({ targetRoleId: "role-1" })],
      new Set(),
      achievedAt
    )[0];
    const nonTarget = selectNewRoleAchievements([candidate()], new Set(), achievedAt)[0];
    expect(target).toMatchObject({ achievedAsTarget: true, celebratedAt: null });
    expect(nonTarget).toMatchObject({ achievedAsTarget: false, celebratedAt: achievedAt });
  });
});
