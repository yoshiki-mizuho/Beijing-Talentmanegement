import { describe, expect, it } from "vitest";
import {
  aggregateTrendingSkills,
  canViewProfile,
  getRecommendationReasons,
  markSnapshotChanges,
  restoreSkillSnapshots
} from "./explore-profile";

describe("explore and profile rules", () => {
  it("公開、本人、直属上司、ADMINだけにプロフィールを見せ、非在籍を制限する", () => {
    const member = { id: "m1", managerId: "boss", status: "ACTIVE", isProfilePublic: false };
    expect(canViewProfile({ role: "MEMBER", memberId: "m1" }, member)).toBe(true);
    expect(canViewProfile({ role: "MANAGER", memberId: "boss" }, member)).toBe(true);
    expect(canViewProfile({ role: "MEMBER", memberId: "other" }, member)).toBe(false);
    expect(
      canViewProfile({ role: "ADMIN", memberId: "admin" }, { ...member, status: "LEAVE" })
    ).toBe(true);
    expect(
      canViewProfile({ role: "MANAGER", memberId: "boss" }, { ...member, status: "LEAVE" })
    ).toBe(false);
  });

  it("直近の上昇だけを技術別に集計する", () => {
    const since = new Date("2026-09-10T00:00:00Z");
    const base = {
      skillName: "TypeScript",
      changedAt: "2026-10-01T00:00:00Z",
      source: "DIRECT_EDIT"
    };
    expect(
      aggregateTrendingSkills(
        [
          { ...base, skillId: "ts", fromLevel: 2, toLevel: 3 },
          { ...base, skillId: "ts", fromLevel: null, toLevel: 1 },
          { ...base, skillId: "ts", fromLevel: 3, toLevel: 2 },
          {
            ...base,
            skillId: "old",
            skillName: "Old",
            changedAt: "2020-01-01",
            fromLevel: 1,
            toLevel: 2
          },
          { ...base, skillId: "back", source: "BACKFILL", fromLevel: 1, toLevel: 2 }
        ],
        since
      )
    ).toEqual([{ skillId: "ts", skillName: "TypeScript", count: 2 }]);
  });

  it("おすすめの理由を複数返す", () => {
    expect(
      getRecommendationReasons({
        candidate: { departmentId: "d", recentLevelUp: true, skills: [{ skillId: "s", level: 4 }] },
        viewerDepartmentId: "d",
        targetGapSkillIds: new Set(["s"]),
        trendingSkillIds: new Set(["s"])
      })
    ).toEqual(["target", "trending", "department"]);
  });

  it("時点以前の最後のレベルを復元し、新規と上昇を示す", () => {
    const changes = [
      {
        skillId: "a",
        skillName: "A",
        fromLevel: null,
        toLevel: 1,
        source: "DIRECT_EDIT",
        changedAt: "2020-01-01"
      },
      {
        skillId: "a",
        skillName: "A",
        fromLevel: 1,
        toLevel: 3,
        source: "DIRECT_EDIT",
        changedAt: "2022-01-01"
      },
      {
        skillId: "b",
        skillName: "B",
        fromLevel: null,
        toLevel: 2,
        source: "DIRECT_EDIT",
        changedAt: "2022-01-01"
      }
    ];
    const snapshots = restoreSkillSnapshots(changes, [
      new Date("2021-01-01"),
      new Date("2023-01-01")
    ]);
    expect(snapshots[0]?.skills).toEqual([{ skillId: "a", skillName: "A", level: 1 }]);
    expect(markSnapshotChanges(snapshots[0]!)[0]?.marker).toEqual({ type: "new" });
    expect(markSnapshotChanges(snapshots[1]!, snapshots[0]!)).toEqual([
      { skillId: "a", skillName: "A", level: 3, marker: { type: "up", fromLevel: 1 } },
      { skillId: "b", skillName: "B", level: 2, marker: { type: "new" } }
    ]);
  });
});
