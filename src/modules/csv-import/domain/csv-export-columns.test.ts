import { describe, expect, it } from "vitest";

import { csvExportDefinitions, toCsvExportRows } from "./csv-export-columns";

describe("CSV export columns", () => {
  it("exports skill rows", () => {
    expect(csvExportDefinitions.skills.columns).toContain("skill_code");
    expect(toCsvExportRows("skills", [{
      code: "TS",
      name: "TypeScript",
      category: { name: "開発" },
      description: null,
      isActive: true,
      levelGuides: [],
    }])).toEqual([["TS", "TypeScript", "開発", "", true, "", "", "", "", ""]]);
  });

  it("exports member skills with platform email", () => {
    expect(csvExportDefinitions["member-skills"].columns[0]).toBe("email");
    expect(toCsvExportRows("member-skills", [{
      member: { id: "member-1" },
      email: "user@local-dev.test",
      skill: { code: "TS" },
      level: 3,
      yearsOfExperience: { toString: () => "2.5" },
      lastAssessedAt: new Date("2026-10-16T00:00:00.000Z"),
    }])).toEqual([["user@local-dev.test", "TS", 3, "2.5", "2026-10-16"]]);
  });

  it("exports roles with and without requirements", () => {
    expect(toCsvExportRows("roles", [{
      code: "ROLE-1",
      name: "リード",
      description: null,
      isActive: true,
      roleRequirements: [{ skill: { code: "TS" }, requiredLevel: 4, isRequired: true, anyOfGroup: null }],
    }])).toEqual([["ROLE-1", "リード", "", true, "TS", 4, true, ""]]);
    expect(toCsvExportRows("roles", [{
      code: "ROLE-2",
      name: "メンバー",
      description: "",
      isActive: true,
      roleRequirements: [],
    }])).toEqual([["ROLE-2", "メンバー", "", true, "", "", "", ""]]);
  });
});
