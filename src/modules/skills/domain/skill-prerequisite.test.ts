import { describe, expect, it } from "vitest";

import { validateSkillPrerequisitePair } from "./skill-prerequisite";

const active = new Set(["a", "b", "c"]);

describe("validateSkillPrerequisitePair", () => {
  it("自分自身と無効なスキルを拒否する", () => {
    expect(validateSkillPrerequisitePair({ skillId: "a", prerequisiteSkillId: "a" }, active, []).valid).toBe(false);
    expect(validateSkillPrerequisitePair({ skillId: "a", prerequisiteSkillId: "x" }, active, []).valid).toBe(false);
  });

  it("重複をスキップし、逆向きを拒否する", () => {
    const existing = [{ skillId: "a", prerequisiteSkillId: "b" }];
    expect(validateSkillPrerequisitePair(existing[0], active, existing)).toEqual({ valid: true, skip: true });
    expect(validateSkillPrerequisitePair({ skillId: "b", prerequisiteSkillId: "a" }, active, existing)).toMatchObject({ valid: false });
  });
});
