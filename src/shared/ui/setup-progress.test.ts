import { describe, expect, it } from "vitest";

import { buildSetupProgress } from "@/shared/ui/setup-progress";

describe("buildSetupProgress", () => {
  it("未完了の初期状態を4項目で返す", () => {
    const progress = buildSetupProgress({
      passwordChangeRequired: true,
      assessmentCount: 0,
      approvedSkillCount: 0,
      hasTargetRole: false
    });

    expect(progress.completedCount).toBe(0);
    expect(progress.totalCount).toBe(4);
    expect(progress.isComplete).toBe(false);
    expect(progress.items.map((item) => item.completed)).toEqual([
      false,
      false,
      false,
      false
    ]);
  });

  it("申請履歴と承認済みスキルの境界値で完了を判定する", () => {
    const progress = buildSetupProgress({
      passwordChangeRequired: false,
      assessmentCount: 1,
      approvedSkillCount: 5,
      hasTargetRole: true
    });

    expect(progress.completedCount).toBe(4);
    expect(progress.isComplete).toBe(true);
    expect(progress.items.every((item) => item.completed)).toBe(true);
  });

  it("承認済みスキルが4件なら登録項目は未完了にする", () => {
    const progress = buildSetupProgress({
      passwordChangeRequired: false,
      assessmentCount: 2,
      approvedSkillCount: 4,
      hasTargetRole: true
    });

    expect(progress.completedCount).toBe(3);
    expect(progress.items.find((item) => item.id === "five-skills")?.completed).toBe(false);
  });

  it("目標ロール未設定ならダッシュボードへの項目を未完了にする", () => {
    const progress = buildSetupProgress({
      passwordChangeRequired: false,
      assessmentCount: 1,
      approvedSkillCount: 5,
      hasTargetRole: false
    });

    expect(progress.items.find((item) => item.id === "target-role")).toEqual({
      id: "target-role",
      label: "目標ロールを設定",
      href: "/dashboard",
      completed: false
    });
  });
});
