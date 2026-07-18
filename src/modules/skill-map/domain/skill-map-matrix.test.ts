import { describe, expect, it } from "vitest";

import { buildSkillMapMatrix } from "@/modules/skill-map/domain/skill-map-matrix";

describe("buildSkillMapMatrix", () => {
  it("builds member skill levels and skill summaries", () => {
    const matrix = buildSkillMapMatrix({
      members: [
        {
          id: "member-1",
          employeeNo: "001",
          name: "A",
          department: { name: "Dev" },
          memberSkills: [{ skillId: "skill-1", level: 4 }]
        },
        {
          id: "member-2",
          employeeNo: "002",
          name: "B",
          department: { name: "Ops" },
          memberSkills: []
        }
      ],
      skills: [
        {
          id: "skill-1",
          code: "SKILL-0001",
          name: "TypeScript",
          category: { name: "Engineering" }
        }
      ]
    });

    expect(matrix.rows).toEqual([
      {
        memberId: "member-1",
        employeeNo: "001",
        memberName: "A",
        departmentName: "Dev",
        levels: [{ skillId: "skill-1", level: 4 }]
      },
      {
        memberId: "member-2",
        employeeNo: "002",
        memberName: "B",
        departmentName: "Ops",
        levels: [{ skillId: "skill-1", level: null }]
      }
    ]);
    expect(matrix.skillSummaries).toEqual([
      {
        skillId: "skill-1",
        holderCount: 1,
        averageLevel: 4
      }
    ]);
  });
});
