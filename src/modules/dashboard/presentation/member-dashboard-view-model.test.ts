import { describe, expect, it } from "vitest";

import { buildMemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";

describe("buildMemberDashboardViewModel", () => {
  it("本人のスキルから最も近い目標ロールと不足スキルを算出する", () => {
    const result = buildMemberDashboardViewModel({
      member: { id: "member-1", name: "山田 太郎", memberSkills: [
        { skillId: "skill-1", level: 3, skill: { name: "TypeScript", category: { name: "開発" } } },
        { skillId: "skill-2", level: 2, skill: { name: "設計", category: { name: "アーキテクチャ" } } }
      ] },
      roles: [
        { id: "role-1", name: "テックリード", roleRequirements: [
          { skillId: "skill-1", requiredLevel: 3, isRequired: true, skill: { name: "TypeScript", category: { name: "開発" } } },
          { skillId: "skill-2", requiredLevel: 4, isRequired: true, skill: { name: "設計", category: { name: "アーキテクチャ" } } }
        ] },
        { id: "role-2", name: "データアナリスト", roleRequirements: [
          { skillId: "skill-3", requiredLevel: 3, isRequired: true, skill: { name: "SQL", category: { name: "データ" } } }
        ] }
      ],
      pendingAssessmentCount: 1,
      unreadNotificationCount: 2
    });

    expect(result).toMatchObject({
      memberName: "山田 太郎", skillCount: 2, averageLevel: 2.5,
      pendingAssessmentCount: 1, unreadNotificationCount: 2,
      targetRole: { id: "role-1", achievementRate: 50, satisfiedSkillCount: 1, gaps: [
        { skillId: "skill-2", currentLevel: 2, requiredLevel: 4, shortfall: 2 }
      ] }
    });
    expect(result?.actions.map((action) => action.id)).toEqual(["close-role-gap", "check-assessment", "read-notifications"]);
  });

  it("スキル未設定時は申告導線を表示し、要件のないロールを候補にしない", () => {
    const result = buildMemberDashboardViewModel({
      member: { id: "member-1", name: "佐藤 花子", memberSkills: [] },
      roles: [{ id: "role-1", name: "未設定ロール", roleRequirements: [] }],
      pendingAssessmentCount: 0,
      unreadNotificationCount: 0
    });
    expect(result?.averageLevel).toBe(0);
    expect(result?.targetRole).toBeNull();
    expect(result?.actions).toEqual([expect.objectContaining({ id: "register-skill", href: "/my/skills" })]);
  });

  it("メンバーが存在しない場合はnullを返す", () => {
    expect(buildMemberDashboardViewModel({ member: null, roles: [], pendingAssessmentCount: 0, unreadNotificationCount: 0 })).toBeNull();
  });
});
