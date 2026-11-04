import { describe, expect, it } from "vitest";

import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";

describe("buildSkillReminderCards", () => {
  it("未登録の新着と、活動が古く承認待ちでない保有スキルを返す", () => {
    const result = buildSkillReminderCards({
      skills: [
        { id: "new", name: "新着", createdAt: new Date("2026-10-20") },
        { id: "stale", name: "見直し", createdAt: new Date("2020-01-01") },
        { id: "pending", name: "承認待ち", createdAt: new Date("2026-10-25") }
      ],
      memberSkills: [
        { skillId: "stale", level: 2 },
        { skillId: "pending", level: 1 }
      ],
      assessments: [
        { skillId: "stale", status: "APPROVED", createdAt: new Date("2026-01-01") },
        { skillId: "pending", status: "PENDING", createdAt: new Date("2026-10-30") }
      ],
      levelChanges: []
    }, new Date("2026-11-01"));

    expect(result.newSkills).toEqual([{ id: "new", name: "新着" }]);
    expect(result.staleSkills).toHaveLength(1);
    expect(result.staleSkills[0]).toMatchObject({ id: "stale", level: 2 });
  });
});
