import { describe, expect, it } from "vitest";
import {
  buildOrganizationDashboard,
  type OrganizationMember,
} from "@/modules/dashboard/domain/dashboard-summary";

const members: OrganizationMember[] = [
  {
    id: "m1",
    department: { id: "d1", name: "開発部" },
    memberSkills: [{ skillId: "s1", level: 4 }],
    roleAchievements: [{ roleId: "r1" }],
    targetRole: {
      id: "r1",
      name: "Engineer",
      roleRequirements: [
        {
          skillId: "s1",
          requiredLevel: 4,
          isRequired: true,
          skill: { name: "TypeScript" },
        },
      ],
    },
  },
  {
    id: "m2",
    department: { id: "d1", name: "開発部" },
    memberSkills: [],
    targetRole: {
      id: "r1",
      name: "Engineer",
      roleRequirements: [
        {
          skillId: "s1",
          requiredLevel: 4,
          isRequired: true,
          skill: { name: "TypeScript" },
        },
      ],
    },
  },
];
describe("buildOrganizationDashboard", () => {
  it("各指標、推移、不足スキル、部署、ロールを集計する", () => {
    const summary = buildOrganizationDashboard({
      members,
      now: new Date("2026-10-12T00:00:00Z"),
      levelChanges: [
        {
          memberId: "m1",
          changedAt: new Date("2026-10-01T00:00:00Z"),
          source: "APPROVAL",
          fromLevel: 3,
          toLevel: 4,
        },
      ],
      pendingAssessments: [
        { memberId: "m2", createdAt: new Date("2026-10-01T00:00:00Z") },
      ],
    });
    expect(summary).toMatchObject({
      currentMonthLevelUps: 1,
      highLevelMembers: 1,
      targetedCount: 2,
      achievedCount: 1,
      pendingCount: 1,
      stalePendingCount: 1,
    });
    expect(summary.missingSkills[0]).toMatchObject({
      name: "TypeScript",
      count: 1,
    });
    expect(summary.departmentSummaries[0]).toMatchObject({
      memberCount: 2,
      achievedRate: 50,
    });
    expect(summary.roleSummaries[0]).toMatchObject({
      achievedCount: 1,
      targetCount: 2,
    });
  });
  it("読む期間より古い変更を除いても全体集計が変わらない", () => {
    const input = {
      members,
      now: new Date("2026-10-12T00:00:00Z"),
      levelChanges: [],
      pendingAssessments: [],
    };
    const oldChange = {
      memberId: "m1",
      changedAt: new Date("2020-01-01T00:00:00Z"),
      source: "APPROVAL",
      fromLevel: 1,
      toLevel: 2,
    };
    expect(
      buildOrganizationDashboard({ ...input, levelChanges: [oldChange] }),
    ).toEqual(buildOrganizationDashboard(input));
  });
});
