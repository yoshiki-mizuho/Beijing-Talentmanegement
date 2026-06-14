import { describe, expect, it } from "vitest";

import {
  evaluateRoleAchievement,
  isRoleAchieved
} from "@/modules/roles/domain/role-achievement";

describe("isRoleAchieved", () => {
  it("returns true when every required skill level is satisfied", () => {
    expect(
      isRoleAchieved(
        [
          { skillId: "typescript", requiredLevel: 3, isRequired: true },
          { skillId: "postgres", requiredLevel: 2, isRequired: true }
        ],
        [
          { skillId: "typescript", level: 4 },
          { skillId: "postgres", level: 2 }
        ]
      )
    ).toBe(true);
  });

  it("returns false when a required skill is missing", () => {
    expect(
      isRoleAchieved(
        [{ skillId: "typescript", requiredLevel: 3, isRequired: true }],
        []
      )
    ).toBe(false);
  });

  it("returns detailed missing requirements and achievement rate", () => {
    const result = evaluateRoleAchievement(
      [
        { skillId: "typescript", requiredLevel: 3, isRequired: true },
        { skillId: "postgres", requiredLevel: 4, isRequired: true }
      ],
      [
        { skillId: "typescript", level: 3 },
        { skillId: "postgres", level: 2 }
      ]
    );

    expect(result.achieved).toBe(false);
    expect(result.achievementRate).toBe(0.5);
    expect(result.satisfiedRequirements).toHaveLength(1);
    expect(result.missingRequirements).toEqual([
      {
        skillId: "postgres",
        requiredLevel: 4,
        isRequired: true,
        memberLevel: 2,
        satisfied: false
      }
    ]);
  });

  it("treats a role with no required requirements as achieved", () => {
    expect(evaluateRoleAchievement([], []).achieved).toBe(true);
    expect(evaluateRoleAchievement([], []).achievementRate).toBe(1);
  });
});
