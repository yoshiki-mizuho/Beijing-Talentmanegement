import { z } from "zod";

export const AUDIT_PAGE_SIZE = 50;
export const auditTargetGroups = [
  "member",
  "skill",
  "role",
  "assessment",
  "csv",
] as const;
export const auditOperationGroups = [
  "create",
  "update",
  "deactivate",
  "delete",
  "approve",
  "correct",
  "reject",
] as const;
export type AuditTargetGroup = (typeof auditTargetGroups)[number];
export type AuditOperationGroup = (typeof auditOperationGroups)[number];

const schema = z.object({
  period: z.enum(["today", "7", "30", "custom"]).catch("30"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  actor: z.string().trim().max(100).optional().catch(undefined),
  target: z.union([z.string(), z.array(z.string())]).optional(),
  operation: z.union([z.string(), z.array(z.string())]).optional(),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().positive().catch(1),
});

export type AuditLogQuery = {
  period: "today" | "7" | "30" | "custom";
  from: Date;
  to: Date;
  fromDate: string;
  toDate: string;
  actor?: string;
  targets: AuditTargetGroup[];
  operations: AuditOperationGroup[];
  q: string;
  page: number;
};

function jstDate(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    date,
  );
}

function startOfJst(date: string) {
  return new Date(`${date}T00:00:00+09:00`);
}

function isValidDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = startOfJst(value);
  return !Number.isNaN(date.getTime()) && jstDate(date) === value;
}

function values<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
) {
  const source = Array.isArray(value) ? value : (value?.split(",") ?? []);
  return source.filter((item): item is T => allowed.includes(item as T));
}

export function parseAuditLogQuery(
  input: Record<string, string | string[] | undefined>,
  now = new Date(),
): AuditLogQuery {
  const parsed = schema.parse(input);
  const today = jstDate(now);
  const customFrom = parsed.from;
  const customTo = parsed.to;
  let fromDate = today;
  let toDate = today;
  if (parsed.period !== "today" && parsed.period !== "custom") {
    const date = startOfJst(today);
    date.setUTCDate(date.getUTCDate() - (Number(parsed.period) - 1));
    fromDate = jstDate(date);
  } else if (
    parsed.period === "custom" &&
    isValidDate(customFrom) &&
    isValidDate(customTo) &&
    customFrom! <= customTo!
  ) {
    fromDate = customFrom!;
    toDate = customTo!;
  } else if (parsed.period === "custom") {
    const date = startOfJst(today);
    date.setUTCDate(date.getUTCDate() - 29);
    fromDate = jstDate(date);
    parsed.period = "30";
  }
  return {
    period: parsed.period,
    from: startOfJst(fromDate),
    to: new Date(`${toDate}T23:59:59.999+09:00`),
    fromDate,
    toDate,
    actor: parsed.actor || undefined,
    targets: values(parsed.target, auditTargetGroups),
    operations: values(parsed.operation, auditOperationGroups),
    q: parsed.q,
    page: parsed.page,
  };
}

export function classifyAuditAction(action: string): AuditOperationGroup {
  if (
    action === "role.requirement.set" ||
    action === "skill.level_guides.update"
  )
    return "update";
  if (action === "role.requirement.remove") return "delete";
  const suffix = action.split(".").at(-1);
  if (suffix === "create") return "create";
  if (suffix === "deactivate") return "deactivate";
  if (suffix === "delete") return "delete";
  if (suffix === "approve") return "approve";
  if (suffix === "correct") return "correct";
  if (suffix === "reject") return "reject";
  return "update";
}

export const operationLabels: Record<AuditOperationGroup, string> = {
  create: "作成",
  update: "更新",
  deactivate: "無効化",
  delete: "削除",
  approve: "承認",
  correct: "補正承認",
  reject: "差し戻し",
};

export function targetGroup(type: string): AuditTargetGroup | null {
  if (type === "Member" || type === "MemberSkill" || type === "Department")
    return "member";
  if (type === "Skill" || type === "SkillCategory") return "skill";
  if (type === "Role") return "role";
  if (type === "SkillSelfAssessment") return "assessment";
  if (type === "Csv" || type === "AuditLog") return "csv";
  return null;
}
