import type { CsvImportError, CsvRecord } from "./csv-import-columns";
import { parseActive, requireValue } from "./csv-import-columns";

export type DepartmentState = {
  id: string;
  code: string;
  name: string;
  parentCode: string | null;
  isActive: boolean;
};

export type DepartmentChange = {
  row: number;
  kind: "new" | "update" | "unchanged";
  id?: string;
  code: string;
  name: string;
  parentCode: string | null;
  isActive: boolean;
  changes: Record<string, { before: unknown; after: unknown }>;
};

export function validateDepartmentImport(
  records: CsvRecord[],
  existing: DepartmentState[],
) {
  const errors: CsvImportError[] = [];
  const rowByCode = new Map<string, number>();
  for (const record of records) {
    requireValue(record, "department_code", errors);
    requireValue(record, "department_name", errors);
    requireValue(record, "is_active", errors);
    parseActive(record, errors);
    const code = record.values.department_code;
    if (code && rowByCode.has(code)) {
      errors.push({
        row: record.row,
        column: "department_code",
        message: `部署コード ${code} がCSV内で重複しています`,
      });
    } else if (code) {
      rowByCode.set(code, record.row);
    }
  }
  const known = new Set([
    ...existing.map((item) => item.code),
    ...rowByCode.keys(),
  ]);
  const parentByCode = new Map(
    existing.map((item) => [item.code, item.parentCode]),
  );
  for (const record of records) {
    const code = record.values.department_code;
    const parent = record.values.parent_department_code || null;
    if (code) {
      parentByCode.set(code, parent);
    }
    if (parent && !known.has(parent)) {
      errors.push({
        row: record.row,
        column: "parent_department_code",
        message: `親部署コード ${parent} が見つかりません`,
      });
    }
    if (parent === code && code) {
      errors.push({
        row: record.row,
        column: "parent_department_code",
        message: "自分自身を親部署にはできません",
      });
    }
  }
  for (const record of records) {
    const start = record.values.department_code;
    const visited = new Set<string>();
    let current: string | null | undefined = start;
    while (current) {
      if (visited.has(current)) {
        errors.push({
          row: record.row,
          column: "parent_department_code",
          message: "部署の親子関係が循環しています",
        });
        break;
      }
      visited.add(current);
      current = parentByCode.get(current);
    }
  }
  const existingByCode = new Map(existing.map((item) => [item.code, item]));
  const invalidRows = new Set(errors.map((error) => error.row));
  const changes = records.flatMap((record): DepartmentChange[] => {
    if (invalidRows.has(record.row)) {
      return [];
    }
    const code = record.values.department_code;
    const name = record.values.department_name;
    const parentCode = record.values.parent_department_code || null;
    const isActive = record.values.is_active.toLowerCase() === "true";
    const current = existingByCode.get(code);
    if (!current) {
      return [
        {
          row: record.row,
          kind: "new",
          code,
          name,
          parentCode,
          isActive,
          changes: {},
        },
      ];
    }
    const diff: DepartmentChange["changes"] = {};
    addDiff(diff, "name", current.name, name);
    addDiff(diff, "parentCode", current.parentCode, parentCode);
    addDiff(diff, "isActive", current.isActive, isActive);
    return [
      {
        row: record.row,
        kind: Object.keys(diff).length ? "update" : "unchanged",
        id: current.id,
        code,
        name,
        parentCode,
        isActive,
        changes: diff,
      },
    ];
  });
  return { changes, errors: uniqueErrors(errors) };
}

function addDiff(
  diff: DepartmentChange["changes"],
  field: string,
  before: unknown,
  after: unknown,
) {
  if (before !== after) {
    diff[field] = { before, after };
  }
}

function uniqueErrors(errors: CsvImportError[]) {
  return errors.filter(
    (error, index) =>
      errors.findIndex(
        (item) =>
          item.row === error.row &&
          item.column === error.column &&
          item.message === error.message,
      ) === index,
  );
}
