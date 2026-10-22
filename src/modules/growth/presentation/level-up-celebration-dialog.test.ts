import { describe, expect, it } from "vitest";

import type { LevelUpCelebration } from "@/modules/growth/application/growth-service";
import { getCelebrationHeading } from "@/modules/growth/presentation/level-up-celebration";

function celebration(fromLevel: number | null): LevelUpCelebration {
  return {
    notificationId: crypto.randomUUID(),
    levelChangeId: crypto.randomUUID(),
    skillName: "TypeScript",
    fromLevel,
    toLevel: 3,
    levelDescription: "一人でできる",
    managerName: "上司",
    managerComment: null,
    targetRoleProgress: null,
    newBadges: []
  };
}

describe("getCelebrationHeading", () => {
  it("新規登録だけなら登録された件数を伝える", () => {
    expect(getCelebrationHeading([celebration(null), celebration(null)]))
      .toBe("2 つのスキルが登録されました");
  });

  it("既存スキルのレベルアップが含まれればレベルアップと伝える", () => {
    expect(getCelebrationHeading([celebration(null), celebration(2)]))
      .toBe("2 つのスキルがレベルアップしました");
    expect(getCelebrationHeading([celebration(2), celebration(null)]))
      .toBe("2 つのスキルがレベルアップしました");
  });
});
