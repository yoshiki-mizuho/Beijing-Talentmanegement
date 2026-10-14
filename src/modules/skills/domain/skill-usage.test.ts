import { describe, expect, it } from "vitest";

import { getSkillDeletionState, type SkillUsage } from "./skill-usage";

const unused: SkillUsage = {
  memberSkills: 0,
  selfAssessments: 0,
  skillLevelChanges: 0,
  cheers: 0,
  roleRequirements: 0
};

describe("getSkillDeletionState", () => {
  it("未使用のスキルを削除可能と判定する", () => {
    expect(getSkillDeletionState(unused)).toEqual({
      isDeletable: true,
      reason: null
    });
  });

  it("使用箇所を含む削除不可理由を返す", () => {
    expect(
      getSkillDeletionState({
        ...unused,
        memberSkills: 2,
        selfAssessments: 1,
        skillLevelChanges: 3,
        cheers: 1,
        roleRequirements: 1
      })
    ).toEqual({
      isDeletable: false,
      reason: "保有・申告・履歴・応援・ロール要件があるため削除できません。無効化してください。"
    });
  });
});
