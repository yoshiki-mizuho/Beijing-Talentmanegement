import { describe, expect, it } from "vitest";

import { achievedRoleNamesAt } from "@/modules/explore/domain/explore-profile";

describe("achievedRoleNamesAt", () => {
  it("指定時点までの達成だけを新しい順に返す", () => {
    const achievements = [
      { roleName: "新しいロール", achievedAt: "2025-06-01T00:00:00.000Z" },
      { roleName: "最初のロール", achievedAt: "2023-01-01T00:00:00.000Z" },
      { roleName: "次のロール", achievedAt: "2024-01-01T00:00:00.000Z" }
    ];

    expect(achievedRoleNamesAt(achievements, new Date("2024-06-01T00:00:00.000Z")))
      .toEqual(["次のロール", "最初のロール"]);
  });
});
