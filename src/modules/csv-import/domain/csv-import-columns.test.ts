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
});
