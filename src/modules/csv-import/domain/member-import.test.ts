import { describe, expect, it } from "vitest";
import { validateMemberImport, type MemberImportState } from "./member-import";

const state: MemberImportState = {
  departments: [{ id: "d1", code: "DEV" }],
  roles: [{ id: "r1", name: "リード", isActive: true }],
  members: [
    {
      id: "m1",
      employeeNo: "E001",
      name: "既存",
      email: "old@example.com",
      departmentId: "d1",
      departmentCode: "DEV",
      jobTitle: null,
      status: "ACTIVE",
      managerId: null,
      managerEmployeeNo: null,
      targetRoleId: null,
      targetRoleName: null,
      canManage: true,
    },
  ],
};

function record(row: number, values: Partial<Record<string, string>> = {}) {
  return {
    row,
    values: {
      employee_no: "E002",
      name: "新規",
      email: "new@example.com",
      department_code: "DEV",
      job_title: "",
      status: "active",
      manager_employee_no: "",
      target_role_name: "",
      ...values,
    },
  };
}

describe("validateMemberImport", () => {
  it("新規と空欄による未設定を作る", () => {
    const result = validateMemberImport([record(2)], state);
    expect(result.errors).toEqual([]);
    expect(result.changes[0]).toMatchObject({
      kind: "new",
      managerId: null,
      targetRoleId: null,
    });
  });

  it("メール、部署、status、上司、ロールを検証する", () => {
    const result = validateMemberImport(
      [
        record(2, {
          email: "bad",
          department_code: "NONE",
          status: "x",
          manager_employee_no: "E002",
          target_role_name: "無効",
        }),
      ],
      state,
    );
    expect(result.errors.map((error) => error.column)).toEqual(
      expect.arrayContaining([
        "email",
        "department_code",
        "status",
        "manager_employee_no",
        "target_role_name",
      ]),
    );
  });

  it("メール重複と上司循環を検証する", () => {
    const result = validateMemberImport(
      [
        record(2, {
          employee_no: "E001",
          email: "new@example.com",
          manager_employee_no: "E003",
        }),
        record(3, {
          employee_no: "E003",
          email: "new@example.com",
          manager_employee_no: "E001",
        }),
      ],
      state,
    );
    expect(result.errors.some((error) => error.message.includes("重複"))).toBe(
      true,
    );
    expect(result.errors.some((error) => error.message.includes("循環"))).toBe(
      true,
    );
  });
});
