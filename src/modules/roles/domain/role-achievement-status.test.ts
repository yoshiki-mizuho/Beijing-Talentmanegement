import { describe, expect, it } from "vitest";

import { resolveRoleAchievementStatus } from "@/modules/roles/domain/role-achievement";

describe("resolveRoleAchievementStatus", () => {
  it.each([
    [false, false, "unachieved"],
    [false, true, "unachieved"],
    [true, true, "achieved"],
    [true, false, "requirements_updated"]
  ] as const)("recorded=%s currentlySatisfied=%s", (recorded, currentlySatisfied, expected) => {
    expect(resolveRoleAchievementStatus({ recorded, currentlySatisfied })).toBe(expected);
  });
});
