import { describe, expect, it } from "vitest";
import { validateRoleImport, type RoleImportState } from "./role-import";
import type { CsvRecord } from "./csv-import-columns";

const state: RoleImportState = {
  skills: [
    { id: "skill-1", code: "S001", name: "設計" },
    { id: "skill-2", code: "S002", name: "実装" },
    { id: "skill-3", code: "S003", name: "運用" },
  ],
  roles: [{
    id: "role-1",
    name: "リード",
    description: "説明",
    isActive: true,
    requirements: [
      { id: "req-1", skillId: "skill-1", requiredLevel: 3, isRequired: true, anyOfGroup: null },
      { id: "req-2", skillId: "skill-2", requiredLevel: 2, isRequired: true, anyOfGroup: null },
    ],
  }],
};

function row(
  line: number,
  values: Partial<CsvRecord["values"]> = {},
): CsvRecord {
  return {
    row: line,
    values: {
      role_name: "リード",
      description: "説明",
      is_active: "true",
      skill_code: "S001",
      required_level: "3",
      is_required: "true",
      any_of_group: "",
      ...values,
    },
  };
}

describe("validateRoleImport", () => {
  it("追加・更新・削除・変更なしの差分を作る", () => {
    const result = validateRoleImport([
      row(2, { required_level: "4" }),
      row(3, { skill_code: "S003", required_level: "1", is_required: "false" }),
    ], state);

    expect(result.errors).toEqual([]);
    expect(result.changes.map((change) => [change.entity, change.kind, change.skillId])).toEqual([
      ["role", "unchanged", undefined],
      ["requirement", "update", "skill-1"],
      ["requirement", "new", "skill-3"],
      ["requirement", "delete", "skill-2"],
    ]);
  });

  it("出力と同じ内容はすべて変更なしになる", () => {
    const result = validateRoleImport([
      row(2),
      row(3, { skill_code: "S002", required_level: "2" }),
    ], state);
    expect(result.errors).toEqual([]);
    expect(result.changes.every((change) => change.kind === "unchanged")).toBe(true);
  });

  it.each([
    ["ロール名の必須", [row(2, { role_name: "" })], "role_name"],
    ["ロール名の長さ", [row(2, { role_name: "あ".repeat(121) })], "role_name"],
    ["説明の長さ", [row(2, { description: "あ".repeat(1001) })], "description"],
    ["状態の形式", [row(2, { is_active: "yes" })], "is_active"],
    ["存在しないスキル", [row(2, { skill_code: "UNKNOWN" })], "skill_code"],
    ["レベルの範囲", [row(2, { required_level: "6" })], "required_level"],
    ["必須の形式", [row(2, { is_required: "yes" })], "is_required"],
    ["OR組の形式", [row(2, { any_of_group: "0" })], "any_of_group"],
    ["スキルなしの要件値", [row(2, { skill_code: "" })], "skill_code"],
    ["スキルの重複", [row(2), row(3)], "skill_code"],
    ["1件だけのOR組", [row(2, { any_of_group: "1" })], "any_of_group"],
    ["状態の食い違い", [row(2), row(3, { skill_code: "S002", is_active: "false" })], "is_active"],
    ["説明の食い違い", [row(2), row(3, { skill_code: "S002", description: "別の説明" })], "description"],
    ["要件なしとの混在", [row(2), row(3, { skill_code: "", required_level: "", is_required: "" })], "skill_code"],
  ])("%sを行と列つきで拒否する", (_name, records, column) => {
    const result = validateRoleImport(records as CsvRecord[], state);
    expect(result.errors.some((error) => error.row >= 2 && error.column === column)).toBe(true);
    expect(result.changes).toEqual([]);
  });

  it("2件以上のOR組とis_requiredを受け付ける", () => {
    const result = validateRoleImport([
      row(2, { any_of_group: "1", is_required: "false" }),
      row(3, { skill_code: "S002", required_level: "2", any_of_group: "1", is_required: "false" }),
    ], state);
    expect(result.errors).toEqual([]);
    expect(result.changes.filter((change) => change.entity === "requirement").every(
      (change) => change.anyOfGroup === 1 && change.isRequired === false,
    )).toBe(true);
  });
});
