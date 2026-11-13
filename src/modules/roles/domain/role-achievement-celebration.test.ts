import { describe, expect, it } from "vitest";

import { selectPendingRoleAchievement } from "@/modules/roles/domain/role-achievement-record";

describe("selectPendingRoleAchievement", () => {
  it("未表示の記録を達成日の古い順に選ぶ", () => {
    const selected = selectPendingRoleAchievement([
      { id: "new", achievedAt: new Date("2026-02-01"), celebratedAt: null },
      { id: "shown", achievedAt: new Date("2025-01-01"), celebratedAt: new Date() },
      { id: "old", achievedAt: new Date("2026-01-01"), celebratedAt: null }
    ]);

    expect(selected?.id).toBe("old");
  });
});
