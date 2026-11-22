import { describe, expect, it } from "vitest";

import { csvImportTargets, mapCsvRecords } from "./csv-import-columns";

describe("CSV import columns", () => {
  it("keeps only skill, member-skill, and role targets", () => {
    expect(csvImportTargets).toEqual(["skills", "member-skills", "roles"]);
  });

  it("detects missing, unknown, and duplicate member-skill columns", () => {
    const result = mapCsvRecords("member-skills", {
      headers: ["email", "email", "unknown"],
      rows: [],
      encoding: "utf-8",
    });
    expect(result.errors.map((error) => error.column)).toEqual(
      expect.arrayContaining(["skill_code", "unknown", "email"]),
    );
  });

  it("accepts all five skill level guides or none", () => {
    const base = ["skill_code", "skill_name", "category_name", "description", "is_active"];
    expect(mapCsvRecords("skills", { headers: base, rows: [], encoding: "utf-8" }).errors).toEqual([]);
    expect(mapCsvRecords("skills", {
      headers: [...base, "level_guide_1", "level_guide_2", "level_guide_3", "level_guide_4", "level_guide_5"],
      rows: [],
      encoding: "utf-8",
    }).errors).toEqual([]);
    expect(mapCsvRecords("skills", {
      headers: [...base, "level_guide_1"],
      rows: [],
      encoding: "utf-8",
    }).errors).toHaveLength(1);
  });
});
