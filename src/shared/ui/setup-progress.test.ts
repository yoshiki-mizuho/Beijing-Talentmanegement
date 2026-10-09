import { describe, expect, it } from "vitest";

import { buildSetupProgress } from "@/shared/ui/setup-progress";

describe("buildSetupProgress", () => {
  it("未完了の初期状態を3項目で返す", () => {
    const progress = buildSetupProgress({
      passwordChangeRequired: true,
      assessmentCount: 0,
      approvedSkillCount: 0
    });

    expect(progress.completedCount).toBe(0);
    expect(progress.totalCount).toBe(3);
    expect(progress.isComplete).toBe(false);
    expect(progress.items.map((item) => item.completed)).toEqual([
      false,
      false,
      false
    ]);
  });

  it("申請履歴と承認済みスキルの境界値で完了を判定する", () => {
    const progress = buildSetupProgress({
      passwordChangeRequired: false,
      assessmentCount: 1,
      approvedSkillCount: 5
    });

    expect(progress.completedCount).toBe(3);
    expect(progress.isComplete).toBe(true);
    expect(progress.items.every((item) => item.completed)).toBe(true);
  });

  it("承認済みスキルが4件なら登録項目は未完了にする", () => {
    const progress = buildSetupProgress({
      passwordChangeRequired: false,
      assessmentCount: 2,
      approvedSkillCount: 4
    });

    expect(progress.completedCount).toBe(2);
    expect(progress.items.find((item) => item.id === "five-skills")?.completed).toBe(false);
  });
});
