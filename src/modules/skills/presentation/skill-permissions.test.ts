import { describe, expect, it } from "vitest";

import { canManageSkillMaster } from "@/modules/skills/presentation/skill-permissions";

describe("canManageSkillMaster", () => {
  it.each([
    ["ADMIN", true],
    ["MANAGER", false],
    ["MEMBER", false]
  ] as const)("%s のスキルマスタ更新可否を返す", (role, expected) => {
    expect(canManageSkillMaster(role)).toBe(expected);
  });
});