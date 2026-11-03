import { describe, expect, it } from "vitest";
import {
  buildDepartmentMetrics,
  comparisonDepartmentIds,
  completedMonths,
  cumulativeCategories,
  momentumFor,
  perPersonLevelUps,
  restoreSkillsAt,
  selectDepartmentId,
} from "./organization-dashboard";

describe("organization dashboard", () => {
  it("先月までの12か月を返す", () =>
    expect(completedMonths(new Date(2026, 10, 3))).toMatchObject([
      { label: "11月" },
      ...Array(10).fill({}),
      { label: "10月" },
    ]));
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
    expect(selectDepartmentId("locked", ["dev"], "dev")).toBe("dev"));
  it("子があれば子、なければ並列を比較する", () => {
    const d = [
      { id: "p", name: "P", parentDepartmentId: null },
      { id: "a", name: "A", parentDepartmentId: "p" },
      { id: "b", name: "B", parentDepartmentId: "p" },
    ];
    expect(comparisonDepartmentIds(d, "p", ["p", "a", "b"])).toEqual([
      "a",
      "b",
    ]);
    expect(comparisonDepartmentIds(d, "a", ["a", "b"])).toEqual(["a", "b"]);
  });
  it("現在値から過去のスキルを復元する", () => {
    const member = {
      id: "m",
      departmentId: "d",
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
      departmentId: "d",
      targetRole: { id: "r", name: "R", roleRequirements: requirements },
      memberSkills: levels.map(([skillId, level]) => ({ skillId, level })),
    });
    const metrics = buildDepartmentMetrics({
      members: [
        member("m1", [
          ["a", 2],
          ["b", 2],
        ]),
        member("m2", [["a", 2]]),
      ],
      changes: [],
      now: new Date(2026, 10, 3),
    });
    expect(metrics.averageProgress).toBe(75);
    expect(metrics.achievedCount).toBe(1);
  });
});
