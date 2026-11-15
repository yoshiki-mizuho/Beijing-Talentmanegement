import { describe, expect, it } from "vitest";

import { buildPreviousGoalResults } from "@/modules/team-goals/application/team-goal-service";

describe("buildPreviousGoalResults", () => {
  it("一括取得した変更履歴を期間別の件数と人数に組み立てる", () => {
    const result = buildPreviousGoalResults(
      [
        {
          months: 1,
          start: new Date("2026-10-01T00:00:00+09:00"),
          end: new Date("2026-11-01T00:00:00+09:00")
        },
        {
          months: 3,
          start: new Date("2026-08-01T00:00:00+09:00"),
          end: new Date("2026-11-01T00:00:00+09:00")
        }
      ],
      [
        { memberId: "a", fromLevel: 1, toLevel: 2, changedAt: new Date("2026-10-10T00:00:00+09:00") },
        { memberId: "a", fromLevel: 2, toLevel: 3, changedAt: new Date("2026-09-10T00:00:00+09:00") },
        { memberId: "b", fromLevel: null, toLevel: 1, changedAt: new Date("2026-08-10T00:00:00+09:00") },
        { memberId: "b", fromLevel: 2, toLevel: 2, changedAt: new Date("2026-10-15T00:00:00+09:00") }
      ]
    );

    expect(result).toEqual({
      "1:LEVEL_UP_COUNT": 1,
      "1:LEVEL_UP_MEMBERS": 1,
      "3:LEVEL_UP_COUNT": 3,
      "3:LEVEL_UP_MEMBERS": 2
    });
  });
});
