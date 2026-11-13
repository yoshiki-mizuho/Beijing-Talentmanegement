import { describe, expect, it } from "vitest";
import { mapCsvRecords } from "./csv-import-columns";

describe("CSV import columns", () => {
  it("不足・未知・重複の列を検出する", () => {
    const result = mapCsvRecords("departments", {
      headers: ["department_code", "department_code", "unknown"],
      rows: [],
      encoding: "utf-8",
    });
    expect(result.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("department_name"),
        expect.stringContaining("unknown"),
        expect.stringContaining("重複"),
      ]),
    );
  });

  it("スキルのレベルの目安は5列すべて、または列なしを受け付ける", () => {
    const baseHeaders = [
      "skill_code",
      "skill_name",
      "category_name",
      "description",
      "is_active",
    ];
    const withoutGuides = mapCsvRecords("skills", {
      headers: baseHeaders,
      rows: [],
      encoding: "utf-8",
    });
    const withGuides = mapCsvRecords("skills", {
      headers: [
        ...baseHeaders,
        "level_guide_1",
        "level_guide_2",
        "level_guide_3",
        "level_guide_4",
        "level_guide_5",
      ],
      rows: [],
      encoding: "utf-8",
    });
    const partialGuides = mapCsvRecords("skills", {
      headers: [...baseHeaders, "level_guide_1"],
      rows: [],
      encoding: "utf-8",
    });

    expect(withoutGuides.errors).toEqual([]);
    expect(withoutGuides.skillLevelGuidesIncluded).toBe(false);
    expect(withGuides.errors).toEqual([]);
    expect(withGuides.skillLevelGuidesIncluded).toBe(true);
    expect(partialGuides.errors).toEqual([
      expect.objectContaining({ message: "レベルの目安の列は5つそろえてください" }),
    ]);
  });
});
