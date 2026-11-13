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

  it("does not treat a role with no required requirements as achieved", () => {
    expect(evaluateRoleAchievement([], []).achieved).toBe(false);
    expect(evaluateRoleAchievement([], []).achievementRate).toBe(0);
  });

  it("treats an any-of group as one unit and accepts either candidate", () => {
    const result = evaluateRoleAchievement([
      { skillId: "react", requiredLevel: 3, isRequired: true, anyOfGroup: 1 },
      { skillId: "vue", requiredLevel: 3, isRequired: true, anyOfGroup: 1 },
      { skillId: "typescript", requiredLevel: 3, isRequired: true, anyOfGroup: null }
    ], [{ skillId: "vue", level: 3 }, { skillId: "typescript", level: 3 }]);
    expect(result.achieved).toBe(true);
    expect(result.requiredCount).toBe(2);
    expect(result.satisfiedCount).toBe(2);
    expect(result.achievementRate).toBe(1);
  });

  it("reports one missing unit when no candidate in a group is satisfied", () => {
    const result = evaluateRoleAchievement([
      { skillId: "react", requiredLevel: 3, isRequired: true, anyOfGroup: 1 },
      { skillId: "vue", requiredLevel: 3, isRequired: true, anyOfGroup: 1 }
    ], []);
    expect(result.achieved).toBe(false);
    expect(result.requiredCount).toBe(1);
    expect(result.missingRequirements).toHaveLength(1);
  });

  it("treats a one-item group as a single and ignores optional requirements", () => {
    const result = evaluateRoleAchievement([
      { skillId: "react", requiredLevel: 3, isRequired: true, anyOfGroup: 1 },
      { skillId: "optional", requiredLevel: 5, isRequired: false }
    ], [{ skillId: "react", level: 3 }]);
    expect(result.achieved).toBe(true);
    expect(result.requiredCount).toBe(1);
  });
});
