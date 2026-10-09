import { describe, expect, it } from "vitest";

import {
  buildSkillSheetRows,
  getNextSkillSheetLevel,
  getSkillLevelDefinitionText,
  getSkillSheetRowStatus,
  isSkillSheetRowChanged,
  selectSkillSheetEncouragement
} from "@/modules/members/presentation/skill-sheet";

describe("skill sheet display logic", () => {
  it("builds each row with current, pending, and target levels in display order", () => {
    const rows = buildSkillSheetRows({
      skills: [
        {
          id: "skill-react",
          name: "React",
          category: {
            id: "frontend",
            name: "フロントエンド",
            displayOrder: 2
          }
        },
        {
          id: "skill-sql",
          name: "SQL",
          category: {
            id: "database",
            name: "データベース",
            displayOrder: 1
          }
        }
      ],
      memberSkills: [{ skillId: "skill-react", level: 3 }],
      pendingAssessments: [{ skillId: "skill-react", requestedLevel: 4 }],
      targetRequirements: [{ skillId: "skill-react", requiredLevel: 4 }]
    });

    expect(rows.map((row) => row.skillId)).toEqual(["skill-sql", "skill-react"]);
    expect(rows[0]).toMatchObject({
      currentLevel: null,
      pendingLevel: null,
      targetLevel: null
    });
    expect(getSkillSheetRowStatus(rows[1])).toEqual([
      "現在 Lv3",
      "承認待ち（申請 Lv4）",
      "目標ロールで Lv4 が必要"
    ]);
  });

  it("toggles a changed level and clears current-level selections", () => {
    expect(getNextSkillSheetLevel(3, null, 4)).toBe(4);
    expect(getNextSkillSheetLevel(3, 4, 4)).toBeNull();
    expect(getNextSkillSheetLevel(3, 4, 3)).toBeNull();
    expect(isSkillSheetRowChanged(3, 4)).toBe(true);
    expect(isSkillSheetRowChanged(3, 3)).toBe(false);
    expect(isSkillSheetRowChanged(null, null)).toBe(false);
  });

  it("describes the selected level and its change", () => {
    expect(
      getSkillLevelDefinitionText(3, 4, "自律して実務を進められる")
    ).toBe("Lv3 → Lv4：自律して実務を進められる");
    expect(getSkillLevelDefinitionText(null, 1, "基礎を理解している")).toBe(
      "未保有 → Lv1：基礎を理解している"
    );
  });
});

describe("skill sheet encouragement", () => {
  const now = new Date("2026-10-10T00:00:00.000Z");

  it("encourages a first application", () => {
    expect(selectSkillSheetEncouragement(null, now)).toBe(
      "最初の一歩を記録しましょう。"
    );
  });

  it.each([
    ["2026-10-07T00:00:00.000Z", "最近の申請を記録できています。次の前進も、焦らず積み重ねていきましょう。"],
    ["2026-09-19T00:00:00.000Z", "前回の申請から3週間。小さな前進も、記録すると次の自信になります。"],
    ["2026-08-11T00:00:00.000Z", "前回の申請から2か月。これまでの変化を振り返り、今の力を記録してみましょう。"]
  ])("selects a message for %s", (lastAssessmentAt, expected) => {
    expect(selectSkillSheetEncouragement(lastAssessmentAt, now)).toBe(expected);
  });
});
