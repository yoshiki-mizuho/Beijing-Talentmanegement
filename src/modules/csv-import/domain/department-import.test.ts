import { describe, expect, it } from "vitest";
import { validateDepartmentImport } from "./department-import";

const record = (row: number, code: string, parent = "", name = code) => ({
  row,
  values: {
    department_code: code,
    department_name: name,
    parent_department_code: parent,
    is_active: "true",
  },
});

describe("department import", () => {
  it("新規・更新・変更なしを分類する", () => {
    const result = validateDepartmentImport(
      [record(2, "NEW"), record(3, "UP", "", "変更後"), record(4, "SAME")],
      [
        {
          id: "1",
          code: "UP",
          name: "変更前",
          parentCode: null,
          isActive: true,
        },
        {
          id: "2",
          code: "SAME",
          name: "SAME",
          parentCode: null,
          isActive: true,
        },
      ],
    );
    expect(result.changes.map((change) => change.kind)).toEqual([
      "new",
      "update",
      "unchanged",
    ]);
  });

  it("未知の親・循環・キー重複を検出する", () => {
    const result = validateDepartmentImport(
      [
        record(2, "A", "B"),
        record(3, "B", "A"),
        record(4, "C", "NONE"),
        record(5, "C"),
      ],
      [],
    );
    expect(result.errors.map((error) => error.message).join(" ")).toMatch(
      /重複/,
    );
    expect(result.errors.map((error) => error.message).join(" ")).toMatch(
      /循環/,
    );
    expect(result.errors.map((error) => error.message).join(" ")).toMatch(
      /見つかりません/,
    );
    expect(result.changes).toEqual([]);
  });

  it("エラーのある行を変更一覧に含めない", () => {
    const result = validateDepartmentImport(
      [record(2, "VALID"), record(3, "INVALID", "UNKNOWN")],
      [],
    );

    expect(result.changes.map((change) => change.row)).toEqual([2]);
  });
});
