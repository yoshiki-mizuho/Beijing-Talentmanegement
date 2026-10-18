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
          targetRole: { name: "リード" },
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
        "リード",
      ],
    ]);
  });

  it("スキルと要件のあるロールを変換する", () => {
    expect(
      toCsvExportRows("skills", [
        {
          code: "TS",
          name: "TypeScript",
          category: { name: "開発" },
          description: null,
          isActive: false,
        },
      ]),
    ).toEqual([["TS", "TypeScript", "開発", "", false]]);
    expect(
      toCsvExportRows("roles", [
        {
          name: "リード",
          description: null,
          isActive: true,
          roleRequirements: [
            {
              skill: { code: "TS" },
              requiredLevel: 4,
              isRequired: false,
            },
          ],
        },
      ]),
    ).toEqual([["リード", "", true, "TS", 4, false]]);
  });

  it("要件のないロールを空欄の要件付きで1行にする", () => {
    expect(
      toCsvExportRows("roles", [
        {
          name: "メンバー",
          description: "標準ロール",
          isActive: true,
          roleRequirements: [],
        },
      ]),
    ).toEqual([["メンバー", "標準ロール", true, "", "", ""]]);
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
