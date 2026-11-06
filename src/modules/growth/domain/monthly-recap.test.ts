import { describe, expect, it } from "vitest";

import {
  buildMonthlyRecap,
  buildRecapNoteDraft,
  getPastMonthlyEncouragement,
  getViewableRecapMonths,
  shouldShowMonthlyRecap
} from "./monthly-recap";

const base = {
  memberId: "me",
  memberCreatedAt: "2026-01-01T00:00:00+09:00",
  month: "2026-10",
  latestCompletedMonth: "2026-10",
  currentSkills: [{ skillId: "next", skillName: "Next.js", level: 3 }],
  levelChanges: [],
  assessments: [],
  voices: [],
  badges: [],
  targetRole: null
} as const;

describe("monthly recap", () => {
  it("uses Tokyo month boundaries", () => {
    const recap = buildMonthlyRecap({
      ...base,
      levelChanges: [
        change("before", "2026-10-31T14:59:59.000Z", null, 1),
        change("after", "2026-10-31T15:00:00.000Z", null, 1)
      ]
    });
    expect(recap.levelUps.map((item) => item.id)).toEqual(["before"]);
  });

  it("counts growth sources, statuses and voices without own activity", () => {
    const recap = buildMonthlyRecap({
      ...base,
      levelChanges: [
        change("new", "2026-10-01T00:00:00+09:00", null, 2),
        { ...change("backfill", "2026-10-02T00:00:00+09:00", 1, 2), source: "BACKFILL" },
        { ...change("csv", "2026-10-03T00:00:00+09:00", 1, 2), source: "CSV_IMPORT" }
      ],
      assessments: [
        assessment("APPROVED"), assessment("CORRECTED"), assessment("REJECTED"), assessment("PENDING")
      ],
      voices: [
        voice("cheer", "other"), voice("reaction", "other", "CONGRATS"),
        voice("comment", "other"), voice("comment", "me")
      ]
    });
    expect(recap.levelUpCount).toBe(1);
    expect(recap.newSkillCount).toBe(1);
    expect(recap.assessmentCounts).toEqual({ approved: 2, rejected: 1, pending: 1 });
    expect(recap.voiceCounts).toEqual({ cheers: 1, reactions: 1, comments: 1 });
  });

  it("formats comparisons and all five encouragement conditions", () => {
    expect(buildMonthlyRecap({ ...base, levelChanges: [change("sep", "2026-09-01T00:00:00+09:00", null, 1), change("oct1", "2026-10-01T00:00:00+09:00", 1, 2), change("oct2", "2026-10-02T00:00:00+09:00", 2, 3)] }).levelUpDifferenceLabel).toBe("9月より +1");
    expect(getPastMonthlyEncouragement(0, false)).toContain("記録がない");
    expect(getPastMonthlyEncouragement(0, true)).toContain("申請や応援");
    expect(getPastMonthlyEncouragement(1, true)).toContain("1回");
    expect(getPastMonthlyEncouragement(3, true)).toContain("コツコツ");
    expect(getPastMonthlyEncouragement(4, true)).toContain("大きく");
  });

  it("restores target role progress at month start and end", () => {
    const recap = buildMonthlyRecap({
      ...base,
      levelChanges: [change("up", "2026-10-15T00:00:00+09:00", 2, 3)],
      targetRole: { name: "フロントエンド", requirements: [{ skillId: "next", skillName: "Next.js", requiredLevel: 3, isRequired: true, anyOfGroup: null }] }
    });
    expect(recap.roleProgress).toMatchObject({ startPercentage: 0, endPercentage: 100, achieved: true });
  });

  it("limits viewable months and decides whether to show the celebration", () => {
    expect(getViewableRecapMonths("2026-09-01T00:00:00+09:00", new Date("2026-11-06T00:00:00+09:00"))).toEqual(["2026-09", "2026-10"]);
    expect(shouldShowMonthlyRecap({ memberCreatedAt: "2026-09-01T00:00:00+09:00", now: new Date("2026-11-01T00:00:00+09:00"), lastRecapSeenMonth: null, hasEvents: true })).toBe(true);
    expect(shouldShowMonthlyRecap({ memberCreatedAt: "2026-11-01T00:00:00+09:00", now: new Date("2026-11-06T00:00:00+09:00"), lastRecapSeenMonth: null, hasEvents: true })).toBe(false);
    expect(shouldShowMonthlyRecap({ memberCreatedAt: "2026-09-01T00:00:00+09:00", now: new Date("2026-11-06T00:00:00+09:00"), lastRecapSeenMonth: "2026-10", hasEvents: true })).toBe(false);
    expect(shouldShowMonthlyRecap({ memberCreatedAt: "2026-09-01T00:00:00+09:00", now: new Date("2026-11-06T00:00:00+09:00"), lastRecapSeenMonth: null, hasEvents: false })).toBe(false);
  });

  it("builds the four 1on1 note drafts", () => {
    expect(buildRecapNoteDraft({ kind: "level-up", skillName: "Next.js", level: 3 })).toContain("Lv3");
    expect(buildRecapNoteDraft({ kind: "new-skill", skillName: "Next.js" })).toContain("新しく");
    expect(buildRecapNoteDraft({ kind: "rejected", skillName: "Next.js" })).toContain("差し戻し");
    expect(buildRecapNoteDraft({ kind: "target-role", missingCount: 1, missingSkills: ["Next.js Lv3"] })).toContain("あと1スキル");
  });
});

function change(id: string, changedAt: string, fromLevel: number | null, toLevel: number) {
  return { id, skillId: "next", skillName: "Next.js", fromLevel, toLevel, source: "ASSESSMENT_APPROVED", changedAt, reactionCount: 0, commentCount: 0 };
}
function assessment(status: "APPROVED" | "CORRECTED" | "REJECTED" | "PENDING") { return { skillId: "next", skillName: "Next.js", status, createdAt: "2026-10-10T00:00:00+09:00" }; }
function voice(kind: "cheer" | "reaction" | "comment", senderId: string, reactionType?: "CONGRATS") { return { kind, senderId, senderName: senderId, createdAt: "2026-10-10T00:00:00+09:00", text: kind === "reaction" ? undefined : "応援", reactionType }; }
