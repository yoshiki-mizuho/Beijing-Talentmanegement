import { describe, expect, it } from "vitest";
import { validateMemberImport, type MemberImportState } from "./member-import";

const state: MemberImportState = {
  departments: [{ id: "d1", code: "DEV" }],
  roles: [{ id: "r1", code: "ROLE-0001", name: "リード", isActive: true }],
  users: [{ email: "old@example.com", memberId: "m1" }],
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
      target_role_code: "",
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

  it("target_role_codeで有効な目標ロールを設定する", () => {
    const result = validateMemberImport([
      record(2, { target_role_code: "ROLE-0001" }),
    ], state);
    expect(result.errors).toEqual([]);
    expect(result.changes[0]).toMatchObject({
      targetRoleId: "r1",
      targetRoleName: "リード",
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
          target_role_code: "ROLE-9999",
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
        "target_role_code",
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

  it("メールを小文字化し、ほかの利用者のメールを拒否する", () => {
    const lowercased = validateMemberImport([
      record(2, { email: "NEW@EXAMPLE.COM" }),
    ], state);
    expect(lowercased.changes[0]?.email).toBe("new@example.com");

    const duplicated = validateMemberImport(
      [record(2, { email: "LOGIN@EXAMPLE.COM" })],
      {
        ...state,
        users: [...state.users, { email: "login@example.com", memberId: "m9" }],
      },
    );
    expect(duplicated.errors.some((error) => error.column === "email")).toBe(true);
  });

  it("在籍中の部下が残る無効化を拒否し、同じCSVで付け替えれば許可する", () => {
    const withReport: MemberImportState = {
      ...state,
      members: [
        state.members[0]!,
        {
          ...state.members[0]!,
          id: "m2",
          employeeNo: "E002",
          name: "部下",
          email: "report@example.com",
          managerId: "m1",
          managerEmployeeNo: "E001",
          canManage: false,
        },
      ],
      users: [
        ...state.users,
        { email: "report@example.com", memberId: "m2" },
      ],
    };
    const rejected = validateMemberImport([
      record(2, { employee_no: "E001", email: "old@example.com", status: "inactive" }),
    ], withReport);
    expect(rejected.errors.some((error) => error.column === "status")).toBe(true);

    const allowed = validateMemberImport([
      record(2, { employee_no: "E001", email: "old@example.com", status: "inactive" }),
      record(3, { employee_no: "E002", email: "report@example.com", manager_employee_no: "" }),
    ], withReport);
    expect(allowed.errors.some((error) => error.column === "status")).toBe(false);
  });
});
