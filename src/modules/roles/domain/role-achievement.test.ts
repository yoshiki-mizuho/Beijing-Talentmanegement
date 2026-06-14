import { describe, expect, it } from "vitest";

import { isRoleAchieved } from "@/modules/roles/domain/role-achievement";

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
});
