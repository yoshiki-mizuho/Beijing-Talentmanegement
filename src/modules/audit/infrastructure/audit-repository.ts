import { Prisma } from "@prisma/client";

import type { AuditAction, AuditTargetType } from "../domain/audit-action";

export type AuditEntry = {
  actorMemberId: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string | null;
  before?: object | null;
  after?: object | null;
  metadata?: object | null;
  csvImportJobId?: string | null;
  // diffForAudit の結果をそのまま展開して渡せるようにする。値は metadata に入れる。
  changedFields?: string[];
};

function toJson(value: object | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function data(entry: AuditEntry): Prisma.AuditLogCreateManyInput {
  const metadata = entry.changedFields
    ? { ...(entry.metadata ?? {}), changedFields: entry.changedFields }
    : entry.metadata;

  return {
    actorMemberId: entry.actorMemberId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    before: toJson(entry.before),
    after: toJson(entry.after),
    metadata: toJson(metadata),
    csvImportJobId: entry.csvImportJobId,
  };
}

export function recordAuditLog(
  db: Prisma.TransactionClient,
  entry: AuditEntry,
) {
  return db.auditLog.create({ data: data(entry) });
}

export function recordAuditLogs(
  db: Prisma.TransactionClient,
  entries: AuditEntry[],
) {
  if (entries.length === 0) return Promise.resolve({ count: 0 });
  return db.auditLog.createMany({ data: entries.map(data) });
}
