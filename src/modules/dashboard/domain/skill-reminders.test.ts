import { describe, expect, it } from "vitest";

import { buildSkillReminderCards } from "@/modules/dashboard/domain/skill-reminders";

describe("buildSkillReminderCards", () => {
  it("未登録かつ承認待ちでない新着を返す", () => {
    const result = buildSkillReminderCards({
      skills: [
        { id: "new", name: "新着", createdAt: new Date("2026-10-20") },
        { id: "pending", name: "承認待ち", createdAt: new Date("2026-10-25") }
      ],
      memberSkills: [{ skillId: "pending", level: 1 }],
      assessments: [
        { skillId: "pending", status: "PENDING", createdAt: new Date("2026-10-30") }
      ]
    }, new Date("2026-11-01"));

    expect(result.newSkills).toEqual([{ id: "new", name: "新着" }]);
  });
});
