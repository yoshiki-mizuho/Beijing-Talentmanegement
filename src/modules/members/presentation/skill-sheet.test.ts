import { describe, expect, it } from "vitest";

import {
  buildSkillSheetRows,
  buildLevelGuideWindow,
  countSkillSheetFilters,
  filterSkillSheetRows,
  getNextSkillSheetLevel,
  getSkillLevelDefinitionText,
  getSkillSheetRowStatus,
  isSkillSheetRowChanged,
  isNewSkill,
  isStaleSkill,
  selectSkillSheetEncouragement
} from "@/modules/members/presentation/skill-sheet";

describe("skill sheet display logic", () => {
  const now = new Date("2026-11-01T00:00:00.000Z");
  it("builds each row with current, pending, and target levels in display order", () => {
    const rows = buildSkillSheetRows({
      skills: [
        {
          id: "skill-react",
          name: "React",
          displayOrder: 1,
          category: {
            id: "frontend",
            name: "フロントエンド",
            displayOrder: 2
          }
        },
        {
          id: "skill-sql",
          name: "SQL",
          displayOrder: 0,
          category: {
            id: "database",
            name: "データベース",
            displayOrder: 1
          }
        }
      ],
      memberSkills: [{ skillId: "skill-react", level: 3 }],
      pendingAssessments: [{ skillId: "skill-react", requestedLevel: 4 }],
      targetRequirements: [{ skillId: "skill-react", requiredLevel: 4 }],
      latestAssessments: [
        { skillId: "skill-sql", status: "REJECTED", managerComment: "実務例を追記してください" }
      ]
    });

    expect(rows.map((row) => row.skillId)).toEqual(["skill-sql", "skill-react"]);
    expect(rows[0]).toMatchObject({
      currentLevel: null,
      pendingLevel: null,
      targetLevel: null,
      isRejected: true,
      rejectionReason: "実務例を追記してください"
    });
    expect(getSkillSheetRowStatus(rows[1])).toEqual([
      "承認待ち（申請 Lv4）"
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

  it("shows only the selected level definition", () => {
    expect(
      getSkillLevelDefinitionText(3, 4, "自律して実務を進められる")
    ).toBe("自律して実務を進められる");
    expect(getSkillLevelDefinitionText(null, 1, "基礎を理解している")).toBe(
      "基礎を理解している"
    );
    expect(getSkillLevelDefinitionText(null, null, undefined)).toBe("");
    expect(getSkillLevelDefinitionText(2, null, undefined)).toBe("");
    expect(getSkillLevelDefinitionText(2, 3, undefined)).toBe("レベル定義が登録されていません。");
  });

  it("combines keyword, status, and category filters", () => {
    const rows = buildSkillSheetRows({
      skills: [
        { id: "react", name: "React", displayOrder: 0, category: { id: "front", name: "フロント", displayOrder: 1 } },
        { id: "sql", name: "SQL", displayOrder: 0, category: { id: "data", name: "データ", displayOrder: 2 } }
      ],
      memberSkills: [{ skillId: "react", level: 2 }],
      pendingAssessments: [],
      targetRequirements: [],
      latestAssessments: []
    });
    expect(filterSkillSheetRows(rows, {
      query: "sql",
      filter: "unowned",
      categoryId: "data",
      groupId: "all",
      changedSkillIds: new Set()
    }).map((row) => row.skillId)).toEqual(["sql"]);
  });

  it("大分類・カテゴリ・未分類で絞り込む", () => {
    const rows = buildSkillSheetRows({
      skills: [
        { id: "react", name: "React", displayOrder: 0, category: { id: "front", name: "フロント", displayOrder: 1, group: { id: "tech", name: "技術", displayOrder: 0 } } },
        { id: "sql", name: "SQL", displayOrder: 0, category: { id: "data", name: "データ", displayOrder: 2, group: { id: "tech", name: "技術", displayOrder: 0 } } },
        { id: "talk", name: "対話", displayOrder: 0, category: { id: "soft", name: "ソフト", displayOrder: 3, group: null } }
      ],
      memberSkills: [], pendingAssessments: [], targetRequirements: [], latestAssessments: []
    });
    const base = { query: "", filter: "all" as const, changedSkillIds: new Set<string>() };
    expect(filterSkillSheetRows(rows, { ...base, groupId: "tech", categoryId: "all" }).map((row) => row.skillId)).toEqual(["react", "sql"]);
    expect(filterSkillSheetRows(rows, { ...base, groupId: "tech", categoryId: "data" }).map((row) => row.skillId)).toEqual(["sql"]);
    expect(filterSkillSheetRows(rows, { ...base, groupId: "unclassified", categoryId: "all" }).map((row) => row.skillId)).toEqual(["talk"]);
  });

  it("判定時点から30日以内のスキルだけを新着にする", () => {
    expect(isNewSkill("2026-10-02T00:00:00.000Z", now)).toBe(true);
    expect(isNewSkill("2026-10-01T23:59:59.000Z", now)).toBe(false);
  });

  it("保有中で承認待ちがなく最後の活動から180日以上なら見直し対象にする", () => {
    expect(isStaleSkill({
      currentLevel: 2,
      pendingLevel: null,
      lastActivityAt: new Date("2026-05-05T00:00:00.000Z")
    }, now)).toBe(true);
    expect(isStaleSkill({
      currentLevel: 2,
      pendingLevel: 3,
      lastActivityAt: new Date("2026-01-01T00:00:00.000Z")
    }, now)).toBe(false);
  });

  it("基準レベルと上下を1から5の範囲で返す", () => {
    expect(buildLevelGuideWindow(3, 4, 2)).toEqual({
      baseLevel: 3,
      levels: [2, 3, 4]
    });
    expect(buildLevelGuideWindow(null, null, 5)).toEqual({
      baseLevel: 5,
      levels: [3, 4, 5]
    });
    expect(buildLevelGuideWindow(null, null, null)).toEqual({
      baseLevel: 1,
      levels: [1, 2, 3]
    });
  });

  it("検索語を除外し、大分類とカテゴリの範囲で絞り込み件数を数える", () => {
    const rows = buildSkillSheetRows({
      skills: [
        { id: "new", name: "New", createdAt: new Date("2026-10-20"), displayOrder: 0, category: { id: "front", name: "フロント", displayOrder: 1 } },
        { id: "old", name: "Old", createdAt: new Date("2020-01-01"), displayOrder: 1, category: { id: "front", name: "フロント", displayOrder: 1 } }
      ],
      memberSkills: [{ skillId: "old", level: 2 }],
      pendingAssessments: [],
      targetRequirements: [{ skillId: "new", requiredLevel: 3 }],
      latestAssessments: []
    });
    const counts = countSkillSheetFilters(rows, {
      categoryId: "front",
      groupId: "all",
      changedSkillIds: new Set(["new"]),
      popularSkillIds: new Set(["old"]),
      now
    });
    expect(counts).toMatchObject({ all: 2, new: 1, target: 1, popular: 1, unowned: 1, changed: 1 });
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
