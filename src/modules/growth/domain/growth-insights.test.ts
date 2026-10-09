import { describe, expect, it } from "vitest";

import {
  buildGrowthCalendar,
  calculateBadgeAchievements,
  calculateCategoryAverages,
  findPotentialMentors,
  getMonthlyEncouragement
} from "@/modules/growth/domain/growth-insights";

const change = (
  skillId: string,
  fromLevel: number | null,
  toLevel: number,
  changedAt: string,
  source = "ASSESSMENT_APPROVED"
) => ({ skillId, fromLevel, toLevel, changedAt, source });

describe("growth insights", () => {
  it("今月のレベルアップ件数に応じた励ましを返す", () => {
    expect(getMonthlyEncouragement(0)).toContain("これから");
    expect(getMonthlyEncouragement(1)).toContain("ひとつ");
    expect(getMonthlyEncouragement(3)).toContain("3件");
    expect(getMonthlyEncouragement(5)).toContain("5件");
  });

  it("8種のバッジと獲得日を履歴から判定する", () => {
    const levelChanges = [
      change("s1", null, 4, "2026-01-05T00:00:00Z"),
      change("s2", null, 5, "2026-02-05T00:00:00Z"),
      change("s3", null, 2, "2026-03-05T00:00:00Z"),
      change("s4", null, 2, "2026-03-06T00:00:00Z"),
      change("s5", null, 2, "2026-03-07T00:00:00Z"),
      ...Array.from({ length: 5 }, (_, index) =>
        change(`s${index + 6}`, null, 1, `2026-04-${String(index + 1).padStart(2, "0")}T00:00:00Z`, "BACKFILL")
      )
    ];
    const result = calculateBadgeAchievements({
      assessments: [{ createdAt: "2025-12-01T00:00:00Z" }],
      memberSkills: Array.from({ length: 10 }, (_, index) => ({ skillId: `s${index + 1}`, level: index === 0 ? 4 : 2 })),
      levelChanges,
      targetRequirements: [{ skillId: "s1", requiredLevel: 4 }],
      mentoredCheers: [
        { toMemberId: "a", createdAt: "2026-01-01T00:00:00Z" },
        { toMemberId: "a", createdAt: "2026-01-02T00:00:00Z" },
        { toMemberId: "b", createdAt: "2026-01-03T00:00:00Z" },
        { toMemberId: "c", createdAt: "2026-01-04T00:00:00Z" }
      ]
    });

    expect(result.filter((badge) => badge.earnedAt)).toHaveLength(8);
    expect(result.find((badge) => badge.id === "save-point")?.earnedAt?.toISOString()).toBe("2026-03-07T00:00:00.000Z");
    expect(result.find((badge) => badge.id === "build-streak")?.earnedAt?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(result.find((badge) => badge.id === "rubber-duck")?.earnedAt?.toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });

  it("申請日とレベルアップ日を日曜始まりの当月カレンダーへ集計する", () => {
    const days = buildGrowthCalendar({
      year: 2026,
      month: 9,
      assessmentDates: ["2026-10-08T01:00:00Z", "2026-10-08T02:00:00Z"],
      levelChanges: [
        change("s1", 2, 3, "2026-10-08T03:00:00Z"),
        change("s2", 3, 2, "2026-10-08T04:00:00Z"),
        change("s3", null, 1, "2026-10-09T03:00:00Z", "BACKFILL")
      ]
    });
    expect(days[0]?.day).toBeNull();
    expect(days.find((day) => day.day === 8)).toMatchObject({ assessmentCount: 2, levelUpCount: 1 });
  });

  it("カテゴリ平均は保有スキルだけで計算し、保有なしを0にする", () => {
    expect(calculateCategoryAverages(
      [{ id: "front", name: "フロント" }, { id: "data", name: "データ" }],
      [{ categoryId: "front", level: 2 }, { categoryId: "front", level: 5 }]
    )).toEqual([
      { id: "front", name: "フロント", average: 3.5 },
      { id: "data", name: "データ", average: 0 }
    ]);
  });

  it("目標の未達スキルをLv4以上で持つ在籍者を優先して最大3人返す", () => {
    const result = findPotentialMentors({
      memberId: "self",
      targetGaps: [{ skillId: "next", skillName: "Next.js" }],
      memberSkills: [],
      candidates: [
        { id: "self", name: "本人", jobTitle: null, status: "ACTIVE", skills: [{ skillId: "next", skillName: "Next.js", level: 5 }] },
        { id: "inactive", name: "休職者", jobTitle: null, status: "INACTIVE", skills: [{ skillId: "next", skillName: "Next.js", level: 5 }] },
        { id: "mentor", name: "先輩", jobTitle: "フロントエンドエンジニア", status: "ACTIVE", skills: [{ skillId: "next", skillName: "Next.js", level: 4 }] }
      ]
    });
    expect(result).toEqual([expect.objectContaining({ memberId: "mentor", skillName: "Next.js", level: 4 })]);
  });

  it("目標未設定時は本人のLv4未満のうち低いスキルを伸ばせる人を探す", () => {
    const result = findPotentialMentors({
      memberId: "self",
      targetGaps: null,
      memberSkills: [
        { skillId: "a", skillName: "A", level: 3 },
        { skillId: "b", skillName: "B", level: 1 }
      ],
      candidates: [
        { id: "one", name: "Aさん", jobTitle: null, status: "ACTIVE", skills: [{ skillId: "a", skillName: "A", level: 5 }] },
        { id: "two", name: "Bさん", jobTitle: null, status: "ACTIVE", skills: [{ skillId: "b", skillName: "B", level: 4 }] }
      ]
    });
    expect(result.map((mentor) => mentor.memberId)).toEqual(["two", "one"]);
  });
});
