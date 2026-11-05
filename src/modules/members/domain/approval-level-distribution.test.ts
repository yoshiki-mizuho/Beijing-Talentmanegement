import { describe, expect, it } from "vitest";

import { buildApprovalLevelDistribution } from "./approval-level-distribution";

describe("buildApprovalLevelDistribution", () => {
  it("本人を除きレベルごとの人数を数える", () => {
    expect(buildApprovalLevelDistribution([
      { id: "applicant", level: 5 },
      { id: "one", level: 1 },
      { id: "two", level: 2 },
      { id: "three", level: 2 },
      { id: "four", level: null }
    ], "applicant")).toEqual({
      groupSize: 4,
      unregisteredCount: 1,
      counts: [1, 2, 0, 0, 0]
    });
  });

  it("本人を除く集団が3人未満なら分布を返さない", () => {
    expect(buildApprovalLevelDistribution([
      { id: "applicant", level: 3 },
      { id: "one", level: 1 },
      { id: "two", level: 2 }
    ], "applicant")).toEqual({
      groupSize: 2,
      unregisteredCount: 0,
      counts: null
    });
  });

  it("目標ロールのない申請者は呼び出し側で分布を作らない", () => {
    const targetRoleId: string | null = null;
    const distribution = targetRoleId
      ? buildApprovalLevelDistribution([], "applicant")
      : null;

    expect(distribution).toBeNull();
  });
});
