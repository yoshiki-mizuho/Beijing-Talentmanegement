import { describe, expect, it } from "vitest";

import {
  aggregateMissingSkills,
  buildMonthComparison,
  findAlmostThereMembers,
  findInactiveMembers,
  getTeamGrowthMessage,
  type TeamMemberSnapshot
} from "@/modules/dashboard/domain/team-dashboard";

const member = (overrides: Partial<TeamMemberSnapshot> = {}): TeamMemberSnapshot => ({
  id: "member-1",
  name: "山田 太郎",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  targetRole: {
    name: "シニアエンジニア",
    roleRequirements: [
      { skillId: "typescript", skillName: "TypeScript", requiredLevel: 3 },
      { skillId: "next", skillName: "Next.js", requiredLevel: 3 }
    ]
  },
  memberSkills: [
    { skillId: "typescript", level: 3 },
    { skillId: "next", level: 2 }
  ],
  pendingAssessments: [],
  assessmentDates: [],
  levelChangeDates: [],
  ...overrides
});

describe("team dashboard aggregations", () => {
  it("finds a member with exactly one unmet required skill", () => {
    expect(findAlmostThereMembers([member({ pendingAssessments: [{ skillId: "next" }] })])).toEqual([
      expect.objectContaining({ skillName: "Next.js", currentLevel: 2, requiredLevel: 3, pending: true })
    ]);
    expect(findAlmostThereMembers([member({ memberSkills: [] })])).toEqual([]);
  });

  it("finds members with no assessment or non-backfill level change for 60 days", () => {
    const result = findInactiveMembers([
      member({ assessmentDates: [new Date("2026-07-28T00:00:00Z")] }),
      member({ id: "recent", assessmentDates: [new Date("2026-09-20T00:00:00Z")] })
    ], new Date("2026-10-09T00:00:00Z"));
    expect(result).toEqual([expect.objectContaining({ memberId: "member-1", daysAgo: 73 })]);
  });

  it("aggregates unmet required skills by member and sorts by count", () => {
    expect(aggregateMissingSkills([
      member(),
      member({ id: "member-2", memberSkills: [] })
    ])).toEqual([
      { skillId: "next", skillName: "Next.js", count: 2 },
      { skillId: "typescript", skillName: "TypeScript", count: 1 }
    ]);
  });

  it("describes the comparison with the previous month", () => {
    expect(buildMonthComparison(3, 1)).toBe("先月より2件増");
    expect(buildMonthComparison(1, 3)).toBe("先月より2件減");
    expect(buildMonthComparison(2, 0)).toBe("先月より2件増");
  });

  it("returns a positive message based on this month's level-ups", () => {
    expect(getTeamGrowthMessage(0)).toContain("挑戦を見守りましょう");
    expect(getTeamGrowthMessage(5)).toBe("5件のレベルアップがありました。挑戦が広がるひと月です。");
  });
});
