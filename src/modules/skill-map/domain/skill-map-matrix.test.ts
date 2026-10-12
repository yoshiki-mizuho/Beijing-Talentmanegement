import { describe, expect, it } from "vitest";
import { buildSkillMap } from "@/modules/skill-map/domain/skill-map-matrix";

const category = { id: "c", name: "言語" };
describe("buildSkillMap", () => {
  it("平均レベル、順位、5段階、2名未満、直近90日の上昇を集計する", () => {
    const skills = buildSkillMap({
      now: new Date("2026-10-12T00:00:00Z"),
      skills: [
        {
          id: "strong",
          name: "A",
          category,
          holders: [
            { id: "1", name: "a", jobTitle: null, avatarUpdatedAt: null, level: 5 },
            { id: "2", name: "b", jobTitle: null, avatarUpdatedAt: null, level: 4 },
          ],
          changes: [
            {
              memberId: "1",
              changedAt: new Date("2026-10-01T00:00:00Z"),
              source: "APPROVAL",
              fromLevel: 4,
              toLevel: 5,
            },
            {
              memberId: "2",
              changedAt: new Date("2026-10-01T00:00:00Z"),
              source: "BACKFILL",
              fromLevel: null,
              toLevel: 4,
            },
          ],
        },
        {
          id: "small",
          name: "B",
          category,
          holders: [
            { id: "3", name: "c", jobTitle: null, avatarUpdatedAt: null, level: 5 }
          ],
          changes: [],
        },
      ],
    });
    expect(skills.find((item) => item.id === "strong")).toMatchObject({
      averageLevel: 4.5,
      rank: 1,
      strength: 5,
      growthCount: 1,
    });
    expect(skills.find((item) => item.id === "small")).toMatchObject({
      rank: null,
      strength: 1,
    });
  });
});
