import { csvExportDefinitions } from "./csv-export-columns";
import type { ParsedCsv } from "./csv-parse";

export const csvImportTargets = ["departments", "skills"] as const;
export type CsvImportTarget = (typeof csvImportTargets)[number];

export type CsvImportError = {
  row: number;
  column: string;
  message: string;
};

export type CsvRecord = {
  row: number;
  values: Record<string, string>;
};

export function isCsvImportTarget(value: string): value is CsvImportTarget {
  return csvImportTargets.includes(value as CsvImportTarget);
}

export function mapCsvRecords(target: CsvImportTarget, csv: ParsedCsv) {
  const expected = [...csvExportDefinitions[target].columns];
  const errors: CsvImportError[] = [];
  for (const column of expected) {
    if (!csv.headers.includes(column)) {
      errors.push({ row: 1, column, message: `列 ${column} がありません` });
    }
  }
  for (const column of csv.headers) {
    if (!expected.includes(column as never)) {
      errors.push({ row: 1, column, message: `不明な列 ${column} があります` });
    }
  }
  for (const column of new Set(csv.headers)) {
    if (csv.headers.filter((header) => header === column).length > 1) {
      errors.push({ row: 1, column, message: `列 ${column} が重複しています` });
    }
  }
  if (errors.length > 0) {
    return { records: [] as CsvRecord[], errors };
  }
  const records = csv.rows.map((row) => ({
    row: row.line,
    values: Object.fromEntries(
      csv.headers.map((header, index) => [header, row.values[index] ?? ""]),
    ),
  }));
  return { records, errors };
}

export function parseActive(record: CsvRecord, errors: CsvImportError[]) {
  const value = record.values.is_active.toLowerCase();
  if (value !== "true" && value !== "false") {
    errors.push({
      row: record.row,
      column: "is_active",
      message: "is_active は true または false にしてください",
    });
    return false;
  }
  return value === "true";
}

export function requireValue(
  record: CsvRecord,
  column: string,
  errors: CsvImportError[],
) {
  if (!record.values[column]) {
    errors.push({
      row: record.row,
      column,
      message: `${column} は必須です`,
    });
  }
}
