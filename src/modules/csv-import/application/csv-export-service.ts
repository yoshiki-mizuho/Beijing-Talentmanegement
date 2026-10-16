import {
  AUDIT_ACTION,
  AUDIT_TARGET_TYPE,
} from "@/modules/audit/domain/audit-action";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { prisma } from "@/server/db/prisma";
import { buildCsv } from "@/shared/lib/csv";
import {
  csvExportDefinitions,
  toCsvExportRows,
  type CsvExportScope,
  type CsvExportTarget,
} from "../domain/csv-export-columns";
import {
  loadCsvExportCounts,
  loadCsvExportRows,
} from "../infrastructure/csv-export-repository";

export async function exportCsv(
  target: CsvExportTarget,
  scope: CsvExportScope,
  actorMemberId: string,
) {
  const rows = await loadCsvExportRows(target, scope);
  const values = toCsvExportRows(target, rows);
  const definition = csvExportDefinitions[target];
  await recordAuditLog(prisma, {
    actorMemberId,
    action: AUDIT_ACTION.CSV_EXPORT,
    targetType: AUDIT_TARGET_TYPE.CSV,
    targetId: null,
    metadata: { target, scope, count: rows.length },
  });
  return buildCsv([...definition.columns], values);
}

export { loadCsvExportCounts };
