import { describe, expect, it } from "vitest";
import { csvExportDefinitions, toCsvExportRows } from "./csv-export-columns";

describe("CSV export columns", () => {
  it("部署の列と値を変換する", () => {
    expect(csvExportDefinitions.departments.columns).toEqual([
      "department_code",
      "department_name",
      "parent_department_code",
      "is_active",
    ]);
    expect(
      toCsvExportRows("departments", [
        {
          code: "DEV",
          name: "開発部",
          parentDepartment: null,
          isActive: true,
        },
      ]),
    ).toEqual([["DEV", "開発部", "", true]]);
  });

  it("メンバーの状態と参照を変換する", () => {
    expect(
      toCsvExportRows("members", [
        {
          employeeNo: "E001",
          name: "山田",
          email: "yamada@example.com",
          department: { code: "DEV" },
          jobTitle: null,
          status: "LEAVE",
          manager: { employeeNo: "E000" },
          targetRole: { code: "ROLE-0001" },
        },
      ]),
    ).toEqual([
      [
        "E001",
        "山田",
        "yamada@example.com",
        "DEV",
        "",
        "leave",
        "E000",
        "ROLE-0001",
      ],
    ]);
  });

  it("スキルと要件のあるロールを変換する", () => {
    expect(csvExportDefinitions.skills.columns).toEqual([
      "skill_code",
      "skill_name",
      "category_name",
      "description",
      "is_active",
      "level_guide_1",
      "level_guide_2",
      "level_guide_3",
      "level_guide_4",
      "level_guide_5",
    ]);
    expect(
      toCsvExportRows("skills", [
        {
          code: "TS",
          name: "TypeScript",
          category: { name: "開発" },
          description: null,
          isActive: false,
          levelGuides: [
            { level: 1, description: "基本を理解している" },
            { level: 3, description: "自立して実践できる" },
          ],
        },
      ]),
    ).toEqual([
      [
        "TS",
        "TypeScript",
        "開発",
        "",
        false,
        "基本を理解している",
        "",
        "自立して実践できる",
        "",
        "",
      ],
    ]);
    expect(
      toCsvExportRows("roles", [
        {
          code: "ROLE-0001",
          name: "リード",
          description: null,
          isActive: true,
          roleRequirements: [
            {
              skill: { code: "TS" },
              requiredLevel: 4,
              isRequired: false,
              anyOfGroup: 2,
            },
          ],
        },
      ]),
    ).toEqual([["ROLE-0001", "リード", "", true, "TS", 4, false, 2]]);
  });

  it("要件のないロールを空欄の要件付きで1行にする", () => {
    expect(
      toCsvExportRows("roles", [
        {
          code: "ROLE-0002",
          name: "メンバー",
          description: "標準ロール",
          isActive: true,
          roleRequirements: [],
        },
      ]),
    ).toEqual([["ROLE-0002", "メンバー", "標準ロール", true, "", "", "", ""]]);
  });

  it("メンバースキルの日付と経験年数を変換する", () => {
    expect(
      toCsvExportRows("member-skills", [
        {
          member: { employeeNo: "E001" },
          skill: { code: "TS" },
          level: 3,
          yearsOfExperience: { toString: () => "2.5" },
          lastAssessedAt: new Date("2026-10-16T00:00:00.000Z"),
        },
      ]),
    ).toEqual([["E001", "TS", 3, "2.5", "2026-10-16"]]);
  });
});
