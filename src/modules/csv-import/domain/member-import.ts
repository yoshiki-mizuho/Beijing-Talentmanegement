import type { CsvImportError, CsvRecord } from "./csv-import-columns";
import { requireValue } from "./csv-import-columns";

export type MemberImportState = {
  members: Array<{
    id: string;
    employeeNo: string;
    name: string;
    email: string;
    departmentId: string;
    departmentCode: string;
    jobTitle: string | null;
    status: string;
    managerId: string | null;
    managerEmployeeNo: string | null;
    targetRoleId: string | null;
    targetRoleName: string | null;
    canManage: boolean;
  }>;
  departments: Array<{ id: string; code: string }>;
  roles: Array<{ id: string; name: string; isActive: boolean }>;
};

export type MemberChange = {
  row: number;
  kind: "new" | "update" | "unchanged";
  id?: string;
  code: string;
  name: string;
  email: string;
  departmentId: string;
  departmentCode: string;
  jobTitle: string | null;
  status: "ACTIVE" | "INACTIVE" | "LEAVE";
  managerId: string | null;
  managerEmployeeNo: string | null;
  targetRoleId: string | null;
  targetRoleName: string | null;
  changes: Record<string, { before: unknown; after: unknown }>;
};

export function validateMemberImport(
  records: CsvRecord[],
  state: MemberImportState,
) {
  const errors: CsvImportError[] = [];
  const existingByNo = new Map(
    state.members.map((member) => [member.employeeNo, member]),
  );
  const departments = new Map(
    state.departments.map((department) => [department.code, department]),
  );
  const roles = new Map(
    state.roles
      .filter((role) => role.isActive)
      .map((role) => [role.name, role]),
  );
  const rowsByNo = new Map<string, CsvRecord>();
  const emailRows = new Map<string, number>();
  for (const record of records) {
    for (const field of [
      "employee_no",
      "name",
      "email",
      "department_code",
      "status",
    ])
      requireValue(record, field, errors);
    const employeeNo = record.values.employee_no;
    const email = record.values.email.toLowerCase();
    const status = record.values.status.toUpperCase();
    if (employeeNo && rowsByNo.has(employeeNo))
      addError(
        errors,
        record,
        "employee_no",
        `社員番号 ${employeeNo} がCSV内で重複しています`,
      );
    if (employeeNo) rowsByNo.set(employeeNo, record);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      addError(
        errors,
        record,
        "email",
        "メールアドレスの形式が正しくありません",
      );
    if (email && emailRows.has(email))
      addError(
        errors,
        record,
        "email",
        `メールアドレス ${email} がCSV内で重複しています`,
      );
    if (email) emailRows.set(email, record.row);
    const conflicting = state.members.find(
      (member) =>
        member.email.toLowerCase() === email &&
        member.employeeNo !== employeeNo,
    );
    if (conflicting)
      addError(
        errors,
        record,
        "email",
        `メールアドレス ${email} は既に使われています`,
      );
    if (!departments.has(record.values.department_code))
      addError(
        errors,
        record,
        "department_code",
        `部署コード ${record.values.department_code} が見つかりません`,
      );
    if (!(["ACTIVE", "INACTIVE", "LEAVE"] as string[]).includes(status))
      addError(
        errors,
        record,
        "status",
        "status は active、inactive、leave のいずれかにしてください",
      );
    const targetRole = record.values.target_role_name;
    if (targetRole && !roles.has(targetRole))
      addError(
        errors,
        record,
        "target_role_name",
        `有効なロール ${targetRole} が見つかりません`,
      );
  }
  const managerByNo = new Map(
    state.members.map((member) => [
      member.employeeNo,
      member.managerEmployeeNo,
    ]),
  );
  for (const record of records)
    managerByNo.set(
      record.values.employee_no,
      record.values.manager_employee_no || null,
    );
  for (const record of records) {
    const employeeNo = record.values.employee_no;
    const managerNo = record.values.manager_employee_no;
    if (!managerNo) continue;
    const manager = existingByNo.get(managerNo);
    if (!manager && rowsByNo.has(managerNo))
      addError(
        errors,
        record,
        "manager_employee_no",
        "CSVで新規作成するメンバーは上司にできません",
      );
    else if (!manager)
      addError(
        errors,
        record,
        "manager_employee_no",
        `上司の社員番号 ${managerNo} が見つかりません`,
      );
    else if (!manager.canManage || manager.status !== "ACTIVE")
      addError(
        errors,
        record,
        "manager_employee_no",
        `${managerNo} は上司にできません`,
      );
    if (managerNo === employeeNo)
      addError(
        errors,
        record,
        "manager_employee_no",
        "自分自身を上司にはできません",
      );
    const visited = new Set<string>();
    let current: string | null | undefined = employeeNo;
    while (current) {
      if (visited.has(current)) {
        addError(
          errors,
          record,
          "manager_employee_no",
          "上司関係が循環しています",
        );
        break;
      }
      visited.add(current);
      current = managerByNo.get(current);
    }
  }
  const invalidRows = new Set(errors.map((error) => error.row));
  const changes = records.flatMap((record): MemberChange[] => {
    const department = departments.get(record.values.department_code);
    if (!department || invalidRows.has(record.row)) return [];
    const current = existingByNo.get(record.values.employee_no);
    const role = roles.get(record.values.target_role_name);
    const manager = existingByNo.get(record.values.manager_employee_no);
    const value = {
      row: record.row,
      code: record.values.employee_no,
      name: record.values.name,
      email: record.values.email,
      departmentId: department.id,
      departmentCode: department.code,
      jobTitle: record.values.job_title || null,
      status: record.values.status.toUpperCase() as MemberChange["status"],
      managerId: manager?.id ?? null,
      managerEmployeeNo: manager?.employeeNo ?? null,
      targetRoleId: role?.id ?? null,
      targetRoleName: role?.name ?? null,
    };
    if (!current) return [{ ...value, kind: "new", changes: {} }];
    const diff: MemberChange["changes"] = {};
    for (const [field, before, after] of [
      ["name", current.name, value.name],
      ["email", current.email, value.email],
      ["departmentCode", current.departmentCode, value.departmentCode],
      ["jobTitle", current.jobTitle, value.jobTitle],
      ["status", current.status, value.status],
      ["managerEmployeeNo", current.managerEmployeeNo, value.managerEmployeeNo],
      ["targetRoleName", current.targetRoleName, value.targetRoleName],
    ] as const)
      if (before !== after) diff[field] = { before, after };
    return [
      {
        ...value,
        id: current.id,
        kind: Object.keys(diff).length ? "update" : "unchanged",
        changes: diff,
      },
    ];
  });
  return { changes, errors };
}

function addError(
  errors: CsvImportError[],
  record: CsvRecord,
  column: string,
  message: string,
) {
  errors.push({ row: record.row, column, message });
}
