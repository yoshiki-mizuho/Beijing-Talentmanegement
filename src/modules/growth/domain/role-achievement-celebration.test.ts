import { describe, expect, it } from "vitest";

import {
  buildNextRoleCandidates,
  detectNewRoleAchievement
} from "@/modules/growth/domain/role-achievement-celebration";

const changedAt = new Date("2026-11-01T00:00:00.000Z");

describe("detectNewRoleAchievement", () => {
  const requirement = { skillId: "react", skillName: "React", requiredLevel: 2, isRequired: true };

  it("今回の変更で達成した場合だけ結果を返す", () => {
    expect(detectNewRoleAchievement({
      requirements: [requirement],
      currentSkills: [{ skillId: "react", level: 2 }],
      changes: [{ skillId: "react", fromLevel: 1, changedAt }]
    })?.achieved).toBe(true);
  });

  it("前から達成していた場合は返さない", () => {
    expect(detectNewRoleAchievement({
      requirements: [requirement],
      currentSkills: [{ skillId: "react", level: 3 }],
      changes: [{ skillId: "react", fromLevel: 2, changedAt }]
    })).toBeNull();
  });

  it("まだ未達の場合は返さない", () => {
    expect(detectNewRoleAchievement({
      requirements: [requirement],
      currentSkills: [{ skillId: "react", level: 1 }],
      changes: [{ skillId: "react", fromLevel: null, changedAt }]
    })).toBeNull();
  });

  it("OR の組のいずれかを今回満たした場合に達成とする", () => {
    expect(detectNewRoleAchievement({
      requirements: [
        { ...requirement, anyOfGroup: 1 },
        { skillId: "vue", skillName: "Vue", requiredLevel: 2, isRequired: true, anyOfGroup: 1 }
      ],
      currentSkills: [{ skillId: "vue", level: 2 }],
      changes: [{ skillId: "vue", fromLevel: 1, changedAt }]
    })?.achieved).toBe(true);
  });
});

describe("buildNextRoleCandidates", () => {
  it("現在・達成済み・要件なしを除外し、達成率順に不足表示を作る", () => {
    const candidates = buildNextRoleCandidates({
      currentRoleId: "current",
      currentSkills: [{ skillId: "a", level: 2 }],
      roles: [
        { id: "current", name: "現在", requirements: [{ skillId: "a", requiredLevel: 3, isRequired: true }] },
        { id: "done", name: "達成済み", requirements: [{ skillId: "a", requiredLevel: 2, isRequired: true }] },
        { id: "empty", name: "要件なし", requirements: [] },
        { id: "far", name: "遠い", requirements: [{ skillId: "b", skillName: "Vue", requiredLevel: 3, isRequired: true }] },
        { id: "near", name: "近い", requirements: [
          { skillId: "a", skillName: "React", requiredLevel: 2, isRequired: true },
          { skillId: "b", skillName: "TypeScript", requiredLevel: 4, isRequired: true }
        ] }
      ]
    });
    expect(candidates.map((candidate) => candidate.id)).toEqual(["near", "far"]);
    expect(candidates[0]).toMatchObject({
      percentage: 50,
      missingCount: 1,
      missingSkills: ["TypeScript Lv4"],
      hasMoreMissingSkills: false
    });
  });
});
