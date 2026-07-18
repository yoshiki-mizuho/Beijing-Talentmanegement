import { describe, expect, it } from "vitest";

import { buildDashboardSummary } from "@/modules/dashboard/domain/dashboard-summary";

describe("buildDashboardSummary", () => {
  it("counts unset members and role achievement rates", () => {
    const summary = buildDashboardSummary({
      members: [
        {
          id: "member-1",
          memberSkills: [{ skillId: "skill-1", level: 3 }]
        },
        {
          id: "member-2",
          memberSkills: []
        }
      ],
      skillsCount: 2,
      activeSkillsCount: 1,
      roles: [
        {
          id: "role-1",
          name: "Developer",
          roleRequirements: [
            {
              skillId: "skill-1",
              requiredLevel: 3,
              isRequired: true
            }
          ]
        }
      ],
      categories: [
        {
          id: "category-1",
          name: "Engineering",
          _count: { skills: 2 }
        }
      ],
      pendingAssessmentsCount: 4,
      unreadNotificationsCount: 5
    });

    expect(summary.memberCount).toBe(2);
    expect(summary.membersWithoutSkills).toBe(1);
    expect(summary.roleSummaries[0]).toMatchObject({
      achievedMembers: 1,
      achievementRate: 0.5,
      requiredSkillCount: 1
    });
    expect(summary.categorySummaries).toEqual([
      {
        id: "category-1",
        name: "Engineering",
        skillCount: 2
      }
    ]);
  });
});
