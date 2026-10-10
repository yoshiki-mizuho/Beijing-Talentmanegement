import { describe, expect, it } from "vitest";

import { buildMemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";
import type { MemberGrowthData } from "@/modules/growth/infrastructure/member-growth-repository";

function fixture(overrides: Partial<MemberGrowthData> = {}): MemberGrowthData {
  return {
    member: {
      id: "member-1",
      name: "山田 太郎",
      targetRoleId: "role-1",
      targetRole: {
        id: "role-1",
        name: "テックリード",
        roleRequirements: [
          { skillId: "skill-1", requiredLevel: 3, isRequired: true, skill: { name: "TypeScript", category: { id: "cat-1", name: "開発" } } },
          { skillId: "skill-2", requiredLevel: 4, isRequired: true, skill: { name: "設計", category: { id: "cat-2", name: "アーキテクチャ" } } }
        ]
      },
      memberSkills: [
        { skillId: "skill-1", level: 3, skill: { name: "TypeScript", category: { id: "cat-1", name: "開発" } } },
        { skillId: "skill-2", level: 2, skill: { name: "設計", category: { id: "cat-2", name: "アーキテクチャ" } } }
      ]
    },
    roles: [{ id: "role-1", name: "テックリード" }],
    categories: [{ id: "cat-1", name: "開発" }, { id: "cat-2", name: "アーキテクチャ" }],
    assessments: [],
    levelChanges: [],
    mentoredCheers: [],
    receivedCheers: [],
    mentorCandidates: [],
    levelDefinitions: [],
    ...overrides
  } as MemberGrowthData;
}

describe("buildMemberDashboardViewModel", () => {
  it("設定した目標ロールの進捗と不足スキルを算出する", () => {
    const result = buildMemberDashboardViewModel(
      fixture(),
      new Date("2026-10-10T00:00:00Z")
    );
    expect(result).toMatchObject({
      memberName: "山田 太郎",
      targetRole: {
        id: "role-1",
        achievementRate: 50,
        satisfiedSkillCount: 1,
        gaps: [{ skillId: "skill-2", currentLevel: 2, requiredLevel: 4 }]
      },
      radar: [
        { id: "cat-1", average: 3 },
        { id: "cat-2", average: 2 }
      ]
    });
  });

  it("目標未設定時は候補を自動選択せず、選択肢を返す", () => {
    const source = fixture();
    const result = buildMemberDashboardViewModel(
      fixture({ member: source.member ? { ...source.member, targetRoleId: null, targetRole: null } : null })
    );
    expect(result?.targetRole).toBeNull();
    expect(result?.roleOptions).toEqual([{ id: "role-1", name: "テックリード" }]);
  });

  it("メンバーが存在しない場合はnullを返す", () => {
    expect(buildMemberDashboardViewModel(fixture({ member: null }))).toBeNull();
  });
});
