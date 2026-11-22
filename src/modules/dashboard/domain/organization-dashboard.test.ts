import { describe, expect, it } from "vitest";
import {
  buildNodeMetrics,
  comparisonNodeIds,
  completedMonths,
  cumulativeCategories,
  dashboardMemberNodeIds,
  dashboardVisibleNodeIds,
  momentumFor,
  organizationDashboardChangesSince,
  perPersonLevelUps,
  restoreSkillsAt,
  selectNodeId,
} from "./organization-dashboard";

describe("organization dashboard", () => {
  it("先月までの12か月を返す", () =>
    expect(completedMonths(new Date(2026, 10, 3))).toMatchObject([
      { label: "11月" },
      ...Array(10).fill({}),
      { label: "10月" },
    ]));
  it.each([
    [new Date(2026, 0, 1), new Date(2025, 0, 1)],
    [new Date(2026, 11, 31), new Date(2025, 11, 1)],
    [new Date(2024, 1, 29), new Date(2023, 1, 1)],
  ])("読む期間を12か月推移の先頭月の月初にする", (now, expected) => {
    expect(organizationDashboardChangesSince(now)).toEqual(expected);
  });
  it("MANAGERが閲覧・比較に使う部署のメンバー範囲を返す", () => {
    const nodes = [
      { id: "root", name: "本部", parentId: null },
      { id: "dev", name: "開発", parentId: "root" },
      { id: "dev-child", name: "開発一課", parentId: "dev" },
      { id: "sales", name: "営業", parentId: "root" },
      { id: "sales-child", name: "営業一課", parentId: "sales" },
      { id: "other", name: "別本部", parentId: null },
    ];
    const visibleIds = dashboardVisibleNodeIds(
      "MANAGER",
      nodes,
      "dev",
    );
    expect(visibleIds).toEqual(["dev", "dev-child", "sales"]);
    expect(dashboardMemberNodeIds(nodes, visibleIds)).toEqual([
      "dev",
      "dev-child",
      "sales",
      "sales-child",
    ]);
  });
  it("勢いの境界と0件を判定する", () => {
    expect(momentumFor(11, 10).momentum).toBe("accelerating");
    expect(momentumFor(9, 10).momentum).toBe("slowing");
    expect(momentumFor(1, 0).momentum).toBe("accelerating");
    expect(momentumFor(0, 0).momentum).toBe("steady");
  });
  it("1人あたりを計算する", () => {
    expect(perPersonLevelUps(6, 4)).toBe(0.5);
    expect(perPersonLevelUps(1, 0)).toBeNull();
  });
  it("範囲外指定を初期値へ戻す", () =>
    expect(selectNodeId("locked", ["dev"], "dev")).toBe("dev"));
  it("子があれば子、なければ並列を比較する", () => {
    const d = [
      { id: "p", name: "P", parentId: null },
      { id: "a", name: "A", parentId: "p" },
      { id: "b", name: "B", parentId: "p" },
    ];
    expect(comparisonNodeIds(d, "p", ["p", "a", "b"])).toEqual([
      "a",
      "b",
    ]);
    expect(comparisonNodeIds(d, "a", ["a", "b"])).toEqual(["a", "b"]);
  });
  it("現在値から過去のスキルを復元する", () => {
    const member = {
      id: "m",
      nodeId: "d",
      targetRole: null,
      memberSkills: [{ skillId: "s", level: 3 }],
    };
    const changes = [
      {
        memberId: "m",
        skillId: "s",
        changedAt: new Date("2026-06-01"),
        source: "DIRECT_EDIT",
        fromLevel: 2,
        toLevel: 3,
        categoryName: "言語",
      },
    ];
    expect(restoreSkillsAt(member, changes, new Date("2026-05-01"))).toEqual([
      { skillId: "s", level: 2 },
    ]);
  });
  it("上位4カテゴリとその他を累積する", () => {
    const changes = ["A", "B", "C", "D", "E"].map((categoryName) => ({
      memberId: "m",
      skillId: categoryName,
      changedAt: new Date(2026, 0, 2),
      source: "DIRECT_EDIT",
      fromLevel: 1,
      toLevel: 2,
      categoryName,
    }));
    const result = cumulativeCategories(changes, [new Date(2026, 0, 1)]);
    expect(result.categories).toHaveLength(5);
    expect(result.series[0]["その他"]).toBe(1);
  });
  it("目標ロールへの平均進捗を%で返す", () => {
    const requirements = [
      {
        skillId: "a",
        requiredLevel: 2,
        isRequired: true,
        skill: { name: "A" },
      },
      {
        skillId: "b",
        requiredLevel: 2,
        isRequired: true,
        skill: { name: "B" },
      },
    ];
    const member = (id: string, levels: [string, number][]) => ({
      id,
      nodeId: "d",
      targetRole: { id: "r", name: "R", roleRequirements: requirements },
      memberSkills: levels.map(([skillId, level]) => ({ skillId, level })),
    });
    const metrics = buildNodeMetrics({
      members: [
        {
          ...member("m1", [
            ["a", 2],
            ["b", 2],
          ]),
          roleAchievements: [{ roleId: "r", achievedAt: new Date(2026, 10, 1) }],
        },
        member("m2", [["a", 2]]),
      ],
      changes: [],
      now: new Date(2026, 10, 3),
    });
    expect(metrics.averageProgress).toBe(75);
    expect(metrics.achievedCount).toBe(1);
  });
  it("読む期間より古い変更を除いても部署指標が変わらない", () => {
    const now = new Date(2026, 10, 3);
    const oldChange = {
      memberId: "m",
      skillId: "s",
      changedAt: new Date(2020, 0, 1),
      source: "DIRECT_EDIT",
      fromLevel: 1,
      toLevel: 2,
      categoryName: "言語",
    };
    const input = {
      members: [{
        id: "m",
        nodeId: "d",
        targetRole: null,
        memberSkills: [{ skillId: "s", level: 2 }],
      }],
      changes: [],
      now,
    };
    expect(buildNodeMetrics({ ...input, changes: [oldChange] })).toEqual(
      buildNodeMetrics(input),
    );
  });
});
