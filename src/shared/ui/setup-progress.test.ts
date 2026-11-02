import { describe, expect, it } from "vitest";

import { buildSetupProgress } from "@/shared/ui/setup-progress";

describe("buildSetupProgress", () => {
  it("未完了の初期状態を3項目で返す", () => {
    const progress = buildSetupProgress({
      hasTargetRole: false,
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

  it("目標ロール設定済みで申請履歴と承認済みスキルがあれば全て完了にする", () => {
    const progress = buildSetupProgress({
      hasTargetRole: true,
      assessmentCount: 1,
      approvedSkillCount: 1
    });

    expect(progress.completedCount).toBe(3);
    expect(progress.isComplete).toBe(true);
    expect(progress.items.every((item) => item.completed)).toBe(true);
  });

  it("目標ロール設定済みなら申請していなくても登録済みスキルで全て完了にする", () => {
    const progress = buildSetupProgress({
      hasTargetRole: true,
      assessmentCount: 0,
      approvedSkillCount: 3
    });

    expect(progress.isComplete).toBe(true);
  });

  it("承認済みスキルがあっても目標ロールが未設定なら進捗を表示する", () => {
    const progress = buildSetupProgress({
      hasTargetRole: false,
      assessmentCount: 0,
      approvedSkillCount: 3
    });

    expect(progress.completedCount).toBe(2);
    expect(progress.isComplete).toBe(false);
    expect(progress.items[0]).toEqual({
      id: "target-role",
      label: "目標ロールを決める",
      href: "/dashboard#target-role",
      completed: false
    });
  });

  it("申請済みでも承認済みスキルがなければ承認項目は未完了にする", () => {
    const progress = buildSetupProgress({
      hasTargetRole: true,
      assessmentCount: 2,
      approvedSkillCount: 0
    });

    expect(progress.completedCount).toBe(2);
    expect(progress.items.find((item) => item.id === "first-approval")).toEqual({
      id: "first-approval",
      label: "上司の承認を待つ",
      href: "/dashboard#first-steps",
      completed: false
    });
  });
});
