import type { Prisma } from "@prisma/client";
import { AUDIT_ACTION } from "../domain/audit-action";
import { buildCsv } from "@/shared/lib/csv";
import {
  buildActionDescription,
  buildAuditSummary,
  buildDiffRows,
  resolveAuditTargetName,
  type JsonMap,
  type NameMaps,
} from "../domain/audit-log-display";
import {
  classifyAuditAction,
  operationLabels,
  parseAuditLogQuery,
} from "../domain/audit-log-query";
import {
  loadAuditActors,
  loadAuditLogs,
  loadAuditLogsForExport,
  loadAuditNameMaps,
  recordAuditExport,
} from "../infrastructure/audit-log-query-repository";

const targetTypeLabels: Record<string, string> = {
  Member: "メンバー",
  MemberSkill: "メンバースキル",
  Skill: "スキル",
  SkillCategory: "スキルカテゴリ",
  Role: "ロール",
  SkillSelfAssessment: "申請・承認",
  AuditLog: "監査ログ",
  Csv: "CSV",
};
const mapJson = (value: Prisma.JsonValue | null): JsonMap | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonMap)
    : null;

export type AuditLogListItem = Awaited<
  ReturnType<typeof listAuditLogs>
>["items"][number];

export async function listAuditLogs(
  input: Record<string, string | string[] | undefined>,
) {
  const query = parseAuditLogQuery(input);
  const [{ logs, total, page, pageCount }, actors] = await Promise.all([
    loadAuditLogs(query),
    loadAuditActors(),
  ]);
  const items = await buildListItems(logs);
  return {
    query: serializeQuery(query),
    actors,
    total,
    page,
    pageCount,
    items,
  };
}

async function buildListItems(
  logs: Awaited<ReturnType<typeof loadAuditLogsForExport>>,
) {
  const lookup = await loadAuditNameMaps(logs);
  const names: NameMaps = {
    members: Object.fromEntries(lookup.members.map((x) => [x.id, x.name])),
    departments: Object.fromEntries(
      lookup.departments.map((x) => [x.id, x.name]),
    ),
    skills: Object.fromEntries(lookup.skills.map((x) => [x.id, x.name])),
    categories: Object.fromEntries(
      lookup.categories.map((x) => [x.id, x.name]),
    ),
    roles: Object.fromEntries(lookup.roles.map((x) => [x.id, x.name])),
  };
  const memberSkill = Object.fromEntries(
    lookup.memberSkills.map((x) => [x.id, x]),
  );
  const assessment = Object.fromEntries(
    lookup.assessments.map((x) => [x.id, x]),
  );
  return logs.map((log) => {
    const before = mapJson(log.before);
    const after = mapJson(log.after);
    const metadata = mapJson(log.metadata);
    const operation = classifyAuditAction(log.action);
    const refs = getTargetReferences(
      log.targetType,
      log.targetId,
      memberSkill,
      assessment,
    );
    const memberId = String(metadata?.memberId ?? refs?.memberId ?? "");
    const skillId = String(metadata?.skillId ?? refs?.skillId ?? "");
    const targetName = resolveAuditTargetName({
      targetType: log.targetType,
      targetId: log.targetId,
      before,
      after,
      memberId,
      skillId,
      names,
    });
    const diffRows = buildDiffRows(before, after, metadata, names);
    const skillName = names.skills[skillId];
    const targetExists = hasTarget(
      log.targetType,
      log.targetId,
      memberId,
      names,
    );
    const displayInput = {
      action: log.action,
      targetType: log.targetType,
      targetName,
      skillName,
      actorMemberId: log.actorMemberId,
      memberId,
      before,
      after,
      metadata,
      names,
      diffRows,
    };
    const isExport =
      log.action === AUDIT_ACTION.AUDIT_LOG_EXPORT ||
      log.action === AUDIT_ACTION.CSV_EXPORT;
    const description = buildActionDescription(displayInput);
    const summary = buildAuditSummary(displayInput);
    return {
      id: log.id,
      occurredAt: log.occurredAt.toISOString(),
      actor: log.actorMember
        ? {
            ...log.actorMember,
            avatarUpdatedAt:
              log.actorMember.avatarUpdatedAt?.toISOString() ?? null,
          }
        : null,
      action: log.action,
      operation: isExport ? ("export" as const) : operation,
      operationLabel: isExport ? "出力" : operationLabels[operation],
      targetType: log.targetType,
      targetTypeLabel: targetTypeLabels[log.targetType] ?? log.targetType,
      targetId: log.targetId,
      targetName,
      targetExists,
      description,
      memberId,
      summary,
      before,
      after,
      metadata,
      diffRows,
    };
  });
}

type TargetReference = { memberId: string; skillId: string };

function hasTarget(
  targetType: string,
  targetId: string | null,
  memberId: string,
  names: NameMaps,
) {
  const id = targetId ?? "";
  if (targetType === "Member") {
    return Boolean(names.members[id]);
  }
  if (targetType === "Skill") {
    return Boolean(names.skills[id]);
  }
  if (targetType === "SkillCategory") {
    return Boolean(names.categories[id]);
  }
  if (targetType === "Role") {
    return Boolean(names.roles[id]);
  }
  if (targetType === "MemberSkill" || targetType === "SkillSelfAssessment") {
    return Boolean(names.members[memberId]);
  }
  return false;
}

function getTargetReferences(
  targetType: string,
  targetId: string | null,
  memberSkills: Record<string, TargetReference>,
  assessments: Record<string, TargetReference>,
) {
  if (targetType === "MemberSkill") {
    return memberSkills[targetId ?? ""];
  }
  if (targetType === "SkillSelfAssessment") {
    return assessments[targetId ?? ""];
  }
  return undefined;
}

function serializeQuery(query: ReturnType<typeof parseAuditLogQuery>) {
  return {
    ...query,
    from: query.from.toISOString(),
    to: query.to.toISOString(),
  };
}

const tokyoDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
export async function exportAuditLogs(
  input: Record<string, string | string[] | undefined>,
  actorMemberId: string,
) {
  const query = parseAuditLogQuery(input);
  const logs = await loadAuditLogsForExport(query);
  if (logs.length > 10_000) {
    return null;
  }
  const items = await buildListItems(logs);
  const headers = [
    "日時",
    "操作した人",
    "操作",
    "対象の種類",
    "対象",
    "変更項目",
    "変更前",
    "変更後",
    "補足",
  ];
  const rows = items.map((item) => [
    tokyoDateTime.format(new Date(item.occurredAt)),
    item.actor?.name ?? "システム",
    item.operationLabel,
    item.targetTypeLabel,
    item.targetName,
    item.diffRows.map((x) => x.label).join("、"),
    JSON.stringify(item.before),
    JSON.stringify(item.after),
    JSON.stringify(item.metadata),
  ]);
  await recordAuditExport(actorMemberId, logs.length, {
    period: query.period,
    from: query.fromDate,
    to: query.toDate,
    ...(query.actor ? { actor: query.actor } : {}),
    targets: query.targets,
    operations: query.operations,
    q: query.q,
  });
  return buildCsv(headers, rows);
}
