import { describe, expect, it } from "vitest";
import {
  validateMemberSkillImport,
  type MemberSkillImportState,
} from "./member-skill-import";

const state: MemberSkillImportState = {
  members: [{ id: "m1", employeeNo: "E001", name: "田中" }],
  skills: [
    { id: "s1", code: "S001", name: "TypeScript", isActive: true },
    { id: "s2", code: "S002", name: "旧", isActive: false },
  ],
  memberSkills: [
    {
      id: "ms1",
      memberId: "m1",
      skillId: "s1",
      level: 2,
      yearsOfExperience: "1.0",
      lastAssessedAt: null,
    },
  ],
};
const record = (row: number, values: Partial<Record<string, string>> = {}) => ({
  row,
  values: {
    employee_no: "E001",
    skill_code: "S001",
    level: "3",
    years_of_experience: "2.5",
    last_assessed_at: "2026-10-17",
    ...values,
  },
});

describe("validateMemberSkillImport", () => {
  it("変更差分を作る", () => {
    const result = validateMemberSkillImport([record(2)], state);
    expect(result.errors).toEqual([]);
    expect(result.changes[0]).toMatchObject({
      kind: "update",
      name: "田中（E001） の TypeScript",
    });
  });

  it("参照、範囲、経験年数、日付、重複を検証する", () => {
    const result = validateMemberSkillImport(
      [
        record(2, {
          employee_no: "X",
          skill_code: "S002",
          level: "6",
          years_of_experience: "100",
          last_assessed_at: "2026-02-30",
        }),
        record(3),
        record(4),
      ],
      state,
    );
    const columns = result.errors.map((error) => error.column);
    expect(columns).toEqual(
      expect.arrayContaining([
        "employee_no",
        "skill_code",
        "level",
        "years_of_experience",
        "last_assessed_at",
      ]),
    );
    expect(result.errors.some((error) => error.message.includes("重複"))).toBe(
      true,
    );
  });
});
