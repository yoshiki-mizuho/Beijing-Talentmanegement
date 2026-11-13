import { describe, expect, it } from "vitest";

import {
  buildGrowthCalendar,
  calculateBadgeAchievements,
  calculateBadgeProgress,
  calculateCategoryAverages,
  findPotentialMentors,
  getGrowthCalendarDayKind,
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
      targetAchievements: [
        { achievedAt: "2026-01-05T00:00:00Z", achievedAsTarget: true }
      ],
      mentoredCheers: [
        { toMemberId: "a", createdAt: "2026-01-01T00:00:00Z" },
        { toMemberId: "a", createdAt: "2026-01-02T00:00:00Z" },
        { toMemberId: "b", createdAt: "2026-01-03T00:00:00Z" },
        { toMemberId: "c", createdAt: "2026-01-04T00:00:00Z" }
      ]
    });

    const originalBadgeIds = ["hello-world", "save-point", "lv4-unlock", "build-streak", "deployed", "full-stack", "master", "rubber-duck"];
    expect(result.filter((badge) => originalBadgeIds.includes(badge.id) && badge.earnedAt)).toHaveLength(8);
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

  it("成長カレンダーの塗りはレベルアップを申請より優先する", () => {
    expect(getGrowthCalendarDayKind({ assessmentCount: 0, levelUpCount: 0 })).toBe("none");
    expect(getGrowthCalendarDayKind({ assessmentCount: 1, levelUpCount: 0 })).toBe("assessment");
    expect(getGrowthCalendarDayKind({ assessmentCount: 1, levelUpCount: 1 })).toBe("level-up");
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

describe("R7-2 badges", () => {
  const base = {
    assessments: [],
    memberSkills: [],
    levelChanges: [],
    targetRequirements: [],
    mentoredCheers: []
  };

  it("11個の追加バッジの獲得日を実データから返す", () => {
    const levels = Array.from({ length: 10 }, (_, index) => ({
      ...change(`s${index}`, null, 1, `2026-${String(index + 1).padStart(2, "0")}-01T00:00:00Z`),
      id: `c${index}`,
      categoryGroupId: index < 3 ? `cat${index}` : "cat0"
    }));
    const result = calculateBadgeAchievements({
      ...base,
      now: new Date("2026-12-31T00:00:00Z"),
      memberCreatedAt: "2025-01-01T00:00:00Z",
      assessments: [
        { skillId: "retry", status: "REJECTED", createdAt: "2026-01-01T00:00:00Z", reviewedAt: "2026-01-02T00:00:00Z" },
        { skillId: "retry", status: "APPROVED", createdAt: "2026-02-01T00:00:00Z", reviewedAt: "2026-02-02T00:00:00Z" },
        { skillId: "top", status: "PENDING", createdAt: "2026-03-02T00:00:00Z" }
      ],
      levelChanges: [
        ...levels,
        { ...change("retry", 1, 2, "2026-02-03T00:00:00Z"), id: "retry", categoryGroupId: "cat0" },
        { ...change("base", null, 3, "2026-03-01T00:00:00Z"), id: "base", categoryGroupId: "cat0" },
        { ...change("late", 1, 2, "2027-07-03T00:00:00Z"), id: "late", categoryGroupId: "cat0" }
      ],
      prerequisites: [{ skillId: "top", prerequisiteSkillId: "base" }],
      firstMoverLevelChangeIds: ["c0"],
      sentCheers: [1, 2, 3].map((day) => ({ toMemberId: `m${day}`, createdAt: `2026-01-0${day}T00:00:00Z` })),
      sentReactions: Array.from({ length: 10 }, (_, index) => ({ createdAt: `2026-02-${String(index + 1).padStart(2, "0")}T00:00:00Z` })),
      receivedTeachReactions: Array.from({ length: 5 }, (_, index) => ({ memberId: `m${index}`, createdAt: `2026-03-0${index + 1}T00:00:00Z` }))
    });
    const earned = new Map(result.map((item) => [item.id, item.earnedAt]));
    for (const id of ["first-mover", "retry-success", "combo-10", "anniversary", "groundwork", "multi-class", "cheer-squad", "applause", "sought-after", "new-year-deploy", "welcome-back"] as const) {
      expect(earned.get(id), id).not.toBeNull();
    }
    // 1〜10月の10件に retry（2/3）と base（3/1）が加わるので、10回目は 8/1
    expect(earned.get("combo-10")?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(earned.get("groundwork")?.toISOString()).toBe("2026-03-02T00:00:00.000Z");
  });

  it("10回目、183日、東京時間の1月を境界にする", () => {
    const nine = Array.from({ length: 9 }, (_, index) => change(`s${index}`, null, 1, `2025-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`));
    expect(calculateBadgeAchievements({ ...base, levelChanges: nine }).find((item) => item.id === "combo-10")?.earnedAt).toBeNull();
    const boundary = calculateBadgeAchievements({
      ...base,
      levelChanges: [
        ...nine,
        change("s10", null, 1, "2025-01-10T00:00:00Z"),
        change("gap182", 1, 2, "2025-07-11T00:00:00Z"),
        change("gap183", 2, 3, "2026-01-10T00:00:00Z")
      ]
    });
    // 2025-01-10 → 07-11 は182日なので、ここでは「おかえり」にならない
    expect(calculateBadgeAchievements({
      ...base,
      levelChanges: [...nine, change("s10", null, 1, "2025-01-10T00:00:00Z"), change("gap182", 1, 2, "2025-07-11T00:00:00Z")]
    }).find((item) => item.id === "welcome-back")?.earnedAt).toBeNull();
    expect(boundary.find((item) => item.id === "combo-10")?.earnedAt).not.toBeNull();
    expect(boundary.find((item) => item.id === "welcome-back")?.earnedAt?.toISOString()).toBe("2026-01-10T00:00:00.000Z");
    const tokyoJanuary = calculateBadgeAchievements({
      ...base,
      levelChanges: [
        change("december", 1, 2, "2025-12-31T14:59:59Z"),
        change("january", 1, 2, "2025-12-31T15:00:00Z")
      ]
    });
    expect(tokyoJanuary.find((item) => item.id === "new-year-deploy")?.earnedAt?.toISOString()).toBe("2025-12-31T15:00:00.000Z");
  });

  it("進み具合は件数を上限付きで返しシークレットを含めない", () => {
    const progress = calculateBadgeProgress({
      ...base,
      sentReactions: Array.from({ length: 9 }, (_, index) => ({ createdAt: new Date(index) }))
    });
    expect(progress.find((item) => item.id === "applause")).toMatchObject({ current: 9, target: 10 });
    expect(progress.some((item) => item.id === "new-year-deploy" || item.id === "welcome-back")).toBe(false);
  });

  it("同じ人の教えてほしい、未分類、BACKFILLを水増しに使わない", () => {
    const input = {
      ...base,
      levelChanges: [
        { ...change("backfill", null, 3, "2026-01-01T00:00:00Z", "BACKFILL"), id: "backfill", categoryGroupId: "cat1" },
        { ...change("one", null, 1, "2026-02-01T00:00:00Z"), id: "one", categoryGroupId: "cat1" },
        { ...change("two", null, 1, "2026-03-01T00:00:00Z"), id: "two", categoryGroupId: null },
        { ...change("three", null, 1, "2026-04-01T00:00:00Z"), id: "three", categoryGroupId: "cat2" }
      ],
      firstMoverLevelChangeIds: ["backfill"],
      receivedTeachReactions: Array.from({ length: 5 }, (_, index) => ({
        memberId: "same-member",
        createdAt: `2026-05-0${index + 1}T00:00:00Z`
      }))
    };
    const achievements = calculateBadgeAchievements(input);
    expect(achievements.find((item) => item.id === "first-mover")?.earnedAt).toBeNull();
    expect(achievements.find((item) => item.id === "multi-class")?.earnedAt).toBeNull();
    expect(achievements.find((item) => item.id === "sought-after")?.earnedAt).toBeNull();
    expect(calculateBadgeProgress(input).find((item) => item.id === "sought-after")?.current).toBe(1);
  });
});
