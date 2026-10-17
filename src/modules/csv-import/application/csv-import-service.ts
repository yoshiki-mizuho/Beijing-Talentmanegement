import {
  mapCsvRecords,
  type CsvImportTarget,
} from "../domain/csv-import-columns";
import { validateDepartmentImport } from "../domain/department-import";
import type { DepartmentChange } from "../domain/department-import";
import { CsvParseError, parseCsvBytes } from "../domain/csv-parse";
import { createPreviewToken } from "../domain/preview-token";
import { validateSkillImport } from "../domain/skill-import";
import type { SkillChange } from "../domain/skill-import";
import { validateMemberImport, type MemberChange } from "../domain/member-import";
import { validateMemberSkillImport, type MemberSkillChange } from "../domain/member-skill-import";
import {
  applyCsvImport,
  loadDepartmentImportState,
  loadSkillImportState,
  loadMemberImportState,
  loadMemberSkillImportState,
} from "../infrastructure/csv-import-repository";

export type CsvImportPreview = Awaited<ReturnType<typeof previewCsvImport>>;

export async function previewCsvImport(
  target: CsvImportTarget,
  bytes: Uint8Array,
) {
  const csv = parseCsvBytes(bytes);
  const mapped = mapCsvRecords(target, csv);
  if (mapped.errors.length > 0) {
    return buildPreview(csv.rows.length, [], mapped.errors);
  }
  if (target === "departments") {
    const state = await loadDepartmentImportState();
    const result = validateDepartmentImport(mapped.records, state);
    return buildPreview(csv.rows.length, result.changes, result.errors);
  }
  if (target === "members") {
    const state = await loadMemberImportState();
    const result = validateMemberImport(mapped.records, state);
    return buildPreview(csv.rows.length, result.changes, result.errors);
  }
  if (target === "member-skills") {
    const state = await loadMemberSkillImportState();
    const result = validateMemberSkillImport(mapped.records, state);
    return buildPreview(csv.rows.length, result.changes, result.errors);
  }
  const state = await loadSkillImportState();
  const result = validateSkillImport(
    mapped.records,
    state.skills,
    state.categories,
  );
  return buildPreview(csv.rows.length, result.changes, result.errors);
}

export async function commitCsvImport(input: {
  target: CsvImportTarget;
  bytes: Uint8Array;
  previewToken: string;
  originalName: string;
  actorMemberId: string;
}) {
  const preview = await previewCsvImport(input.target, input.bytes);
  if (preview.errors.length > 0) {
    return { status: "invalid" as const, preview };
  }
  if (preview.previewToken !== input.previewToken) {
    return { status: "conflict" as const };
  }
  const common = {
    target: input.target,
    originalName: input.originalName,
    actorMemberId: input.actorMemberId,
    totalRows: preview.totalRows,
    unchanged: preview.summary.unchanged,
  };
  let result;
  switch (input.target) {
    case "departments":
      result = await applyCsvImport({
          ...common,
          departmentChanges: preview.changes as DepartmentChange[],
        });
      break;
    case "members":
      result = await applyCsvImport({ ...common, memberChanges: preview.changes as MemberChange[] });
      break;
    case "member-skills":
      result = await applyCsvImport({ ...common, memberSkillChanges: preview.changes as MemberSkillChange[] });
      break;
    case "skills":
      result = await applyCsvImport({
          ...common,
          skillChanges: preview.changes as SkillChange[],
        });
      break;
  }
  return { status: "applied" as const, ...result };
}

function buildPreview<T extends { kind: "new" | "update" | "unchanged" }>(
  totalRows: number,
  changes: T[],
  errors: Array<{ row: number; column: string; message: string }>,
) {
  const summary = {
    created: changes.filter((change) => change.kind === "new").length,
    updated: changes.filter((change) => change.kind === "update").length,
    unchanged: changes.filter((change) => change.kind === "unchanged").length,
    errors: errors.length,
  };
  return {
    totalRows,
    summary,
    changes,
    errors,
    previewToken: createPreviewToken({ totalRows, summary, changes, errors }),
  };
}

export function isCsvSizeError(error: unknown) {
  return error instanceof CsvParseError && error.message.includes("1MB");
}

export function csvImportErrorMessage(error: unknown) {
  return error instanceof CsvParseError
    ? error.message
    : "CSVを処理できませんでした";
}
