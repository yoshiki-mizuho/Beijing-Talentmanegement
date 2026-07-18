import { describe, expect, it } from "vitest";

import { buildSkillMapPresentation } from "@/modules/skill-map/presentation/skill-map-view-model";

describe("buildSkillMapPresentation", () => {
  it("設定済みセル数、充足率、平均レベルを算出する", () => {
    const result = buildSkillMapPresentation({
      skills: [{ id: "skill-1" }, { id: "skill-2" }],
      rows: [
        { levels: [{ level: 3 }, { level: null }] },
        { levels: [{ level: 2 }, { level: 4 }] }
      ],
      skillSummaries: [
        { holderCount: 2, averageLevel: 2.5 },
        { holderCount: 1, averageLevel: 4 }
      ]
    });

    expect(result).toEqual({
      memberCount: 2,
      skillCount: 2,
      assignedCount: 3,
      coverageRate: 75,
      averageLevel: 3
    });
  });

  it("対象セルがない場合はゼロ除算せず空の集計を返す", () => {
    const result = buildSkillMapPresentation({
      skills: [],
      rows: [],
      skillSummaries: []
    });

    expect(result.coverageRate).toBe(0);
    expect(result.averageLevel).toBeNull();
  });
});
