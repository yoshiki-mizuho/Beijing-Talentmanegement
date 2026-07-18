import { describe, expect, it } from "vitest";

import { buildDashboardViewModel } from "@/modules/dashboard/presentation/dashboard-view-model";

describe("buildDashboardViewModel", () => {
  it("集計値をチャートと要対応表示へ変換する", () => {
    const result = buildDashboardViewModel({
      memberCount: 10,
      skillCount: 8,
      activeSkillsCount: 7,
      membersWithoutSkills: 2,
      pendingAssessmentsCount: 3,
      unreadNotificationsCount: 4,
      roleSummaries: [{ id: "role-1", name: "Tech Lead", requiredSkillCount: 3, achievedMembers: 6, achievementRate: 0.6 }],
      categorySummaries: [
        { id: "category-1", name: "Business", skillCount: 2 },
        { id: "category-2", name: "Engineering", skillCount: 6 }
      ]
    });

    expect(result.roles[0]).toMatchObject({ rate: 60, achievedMembers: 6 });
    expect(result.categories.map((category) => category.value)).toEqual([6, 2]);
    expect(result.signals.map((signal) => signal.value)).toEqual([2, 3, 4]);
  });
});