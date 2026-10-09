import { describe, expect, it } from "vitest";

import { shouldRecordSkillLevelChange } from "@/modules/members/domain/skill-level-change-policy";

describe("shouldRecordSkillLevelChange", () => {
  it("records a newly acquired skill and a changed level", () => {
    expect(shouldRecordSkillLevelChange(null, 1)).toBe(true);
    expect(shouldRecordSkillLevelChange(2, 3)).toBe(true);
  });

  it("does not record an unchanged level", () => {
    expect(shouldRecordSkillLevelChange(3, 3)).toBe(false);
  });
});
