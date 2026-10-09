import { describe, expect, it } from "vitest";

import {
  buildSkillMapMatrix,
  filterSkillMapData
} from "@/modules/skill-map/domain/skill-map-matrix";

describe("buildSkillMapMatrix", () => {
  it("builds member skill levels and skill summaries", () => {
    const matrix = buildSkillMapMatrix({
      members: [
        {
          id: "member-1",
          employeeNo: "001",
          name: "A",
          department: { id: "department-1", name: "Dev" },
          memberSkills: [{ skillId: "skill-1", level: 4 }]
        },
        {
          id: "member-2",
          employeeNo: "002",
          name: "B",
          department: { id: "department-2", name: "Ops" },
          memberSkills: []
        }
      ],
      skills: [
        {
          id: "skill-1",
          code: "SKILL-0001",
          name: "TypeScript",
          category: { id: "category-1", name: "Engineering" }
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

  it("部署・カテゴリ・氏名または社員番号で絞り込む", () => {
    const input = {
      members: [
        {
          id: "member-1",
          employeeNo: "A-001",
          name: "山田 太郎",
          department: { id: "department-1", name: "開発部" },
          memberSkills: []
        },
        {
          id: "member-2",
          employeeNo: "B-002",
          name: "佐藤 花子",
          department: { id: "department-2", name: "営業部" },
          memberSkills: []
        }
      ],
      skills: [
        {
          id: "skill-1",
          code: "SKILL-0001",
          name: "TypeScript",
          category: { id: "category-1", name: "開発" }
        },
        {
          id: "skill-2",
          code: "SKILL-0002",
          name: "提案",
          category: { id: "category-2", name: "営業" }
        }
      ]
    };

    expect(
      filterSkillMapData(input, {
        q: "a-001",
        departmentId: "department-1",
        categoryId: "category-2"
      })
    ).toEqual({ members: [input.members[0]], skills: [input.skills[1]] });

    expect(filterSkillMapData(input, { q: "花子" }).members).toEqual([
      input.members[1]
    ]);
  });
});
