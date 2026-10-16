import { getMemberStatusLabel } from "@/modules/members/presentation/member-display";

export type JsonMap = Record<string, unknown>;
export type NameMaps = Record<string, Record<string, string>>;

const labels: Record<string, string> = {
  employeeNo: "社員番号",
  name: "名前",
  email: "メール",
  departmentId: "部署",
  jobTitle: "役職",
  status: "状態",
  profile: "自己紹介",
  managerId: "上司",
  targetRoleId: "目標ロール",
  level: "レベル",
  code: "コード",
  categoryId: "カテゴリ",
  description: "説明",
  isActive: "有効",
  displayOrder: "表示順",
  requiredLevel: "必要レベル",
  isRequired: "必須",
  requestedLevel: "申請レベル",
  approvedLevel: "承認レベル",
  count: "件数",
  yearsOfExperience: "経験年数",
  memberId: "メンバー",
  skillId: "スキル",
  comment: "コメント",
};
for (let level = 1; level <= 5; level += 1)
  labels[`level${level}`] = `レベルの目安 Lv${level}`;

export function fieldLabel(field: string) {
  if (/^[1-5]$/.test(field)) return `レベルの目安 Lv${field}`;
  return labels[field] ?? field;
}

export function displayValue(
  field: string,
  value: unknown,
  names: NameMaps = {},
) {
  if (value === null || value === undefined) return "—";
  if (
    field === "level" ||
    field === "requestedLevel" ||
    field === "approvedLevel" ||
    field === "requiredLevel"
  )
    return `Lv${value}`;
  if (field === "status") {
    const statuses: Record<string, string> = {
      PENDING: "承認待ち",
      APPROVED: "承認済み",
      CORRECTED: "補正承認済み",
      REJECTED: "差し戻し",
    };
    return statuses[String(value)] ?? getMemberStatusLabel(String(value));
  }
  if (typeof value === "boolean")
    return field === "isRequired"
      ? value
        ? "必須"
        : "任意"
      : value
        ? "有効"
        : "無効";
  const mapKey: Record<string, string> = {
    departmentId: "departments",
    categoryId: "categories",
    managerId: "members",
    targetRoleId: "roles",
    memberId: "members",
    skillId: "skills",
  };
  if (mapKey[field])
    return names[mapKey[field]]?.[String(value)] ?? "（削除済み）";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export type DiffRow = {
  field: string;
  label: string;
  before?: string;
  after?: string;
  content?: string;
  redacted?: boolean;
};
export function buildDiffRows(
  before: JsonMap | null,
  after: JsonMap | null,
  metadata: JsonMap | null,
  names: NameMaps = {},
): DiffRow[] {
  const changed = Array.isArray(metadata?.changedFields)
    ? metadata.changedFields.filter((v): v is string => typeof v === "string")
    : [];
  const fields = [
    ...new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
      ...changed,
    ]),
  ];
  const rows: DiffRow[] = fields.map((field) => {
    const hasBefore = Object.hasOwn(before ?? {}, field);
    const hasAfter = Object.hasOwn(after ?? {}, field);
    const hidden = !hasBefore && !hasAfter;
    return {
      field,
      label: fieldLabel(field),
      before: hasBefore
        ? displayValue(field, before?.[field], names)
        : undefined,
      after: hasAfter ? displayValue(field, after?.[field], names) : undefined,
      redacted: hidden,
    };
  });
  for (const field of ["requestedLevel", "approvedLevel", "comment", "count"]) {
    if (metadata?.[field] !== undefined && !fields.includes(field))
      rows.push({
        field,
        label: fieldLabel(field),
        content: displayValue(field, metadata[field], names),
      });
  }
  return rows;
}

export type AuditActionDescription = {
  prefix: string;
  target: string;
  suffix: string;
};

type AuditDisplayInput = {
  action: string;
  targetType: string;
  targetName: string;
  skillName?: string;
  actorMemberId?: string | null;
  memberId?: string;
  before: JsonMap | null;
  after: JsonMap | null;
  metadata: JsonMap | null;
  names?: NameMaps;
  diffRows?: DiffRow[];
};

const actionVerbs: Record<string, string> = {
  create: "作成",
  update: "更新",
  deactivate: "無効化",
  delete: "削除",
};

function actionSuffix(action: string) {
  return actionVerbs[action.split(".").at(-1) ?? ""] ?? "更新";
}

export function buildActionDescription(
  input: AuditDisplayInput,
): AuditActionDescription {
  const { action, targetName } = input;
  if (action === "skill.level_guides.update") {
    return {
      prefix: "スキル ",
      target: targetName,
      suffix: " のレベルの目安を更新",
    };
  }
  if (
    action === "role.requirement.set" ||
    action === "role.requirement.remove"
  ) {
    return {
      prefix: "ロール ",
      target: targetName,
      suffix: ` の要件（${input.skillName ?? "（削除済み）"}）を${
        action.endsWith(".set") ? "設定" : "削除"
      }`,
    };
  }
  if (action === "member.manager.update") {
    return { prefix: "", target: targetName, suffix: " の上司を変更" };
  }
  if (action === "member.target_role.update") {
    return { prefix: "", target: targetName, suffix: " の目標ロールを変更" };
  }
  if (action.startsWith("skill_assessment.")) {
    const verb = {
      "skill_assessment.create": "申請",
      "skill_assessment.approve": "承認",
      "skill_assessment.correct": "補正承認",
      "skill_assessment.reject": "差し戻し",
    }[action];
    const isOwnApplication =
      action === "skill_assessment.create" &&
      input.actorMemberId === input.memberId;
    return {
      prefix: "",
      target: isOwnApplication
        ? (input.skillName ?? "（削除済み）")
        : targetName,
      suffix: ` を${verb ?? "更新"}`,
    };
  }
  if (action.startsWith("member_skill.")) {
    const verb = {
      "member_skill.create": "設定",
      "member_skill.update": "変更",
      "member_skill.delete": "削除",
    }[action];
    return { prefix: "", target: targetName, suffix: ` のレベルを${verb}` };
  }
  if (action === "audit_log.export") {
    return { prefix: "", target: "監査ログ", suffix: " を CSV で出力" };
  }
  if (action === "csv.export") {
    return {
      prefix: "",
      target: csvTargetLabel(String(input.metadata?.target ?? "")),
      suffix: " の CSV を出力",
    };
  }
  const prefix =
    {
      Skill: "スキル ",
      SkillCategory: "カテゴリ ",
      Role: "ロール ",
    }[input.targetType] ?? "";
  return {
    prefix,
    target: targetName,
    suffix: ` を${actionSuffix(action)}`,
  };
}

function levelChange(before: unknown, after: unknown) {
  const from = before === null || before === undefined ? "" : `Lv${before}`;
  const to = after === null || after === undefined ? "" : `Lv${after}`;
  return [from, to].filter(Boolean).join(" → ");
}

export function buildAuditSummary(input: AuditDisplayInput) {
  const { action, before, after, metadata, names = {}, diffRows = [] } = input;
  if (action === "audit_log.export" || action === "csv.export") {
    return metadata?.count === undefined ? "" : `${metadata.count}件`;
  }
  if (action === "skill_assessment.reject") {
    return String(metadata?.comment ?? "差し戻し");
  }
  if (action === "skill_assessment.approve") {
    return levelChange(undefined, metadata?.approvedLevel);
  }
  if (action === "skill_assessment.correct") {
    return levelChange(metadata?.requestedLevel, metadata?.approvedLevel);
  }
  if (action.startsWith("member_skill.")) {
    const level = action.endsWith(".delete") ? before?.level : after?.level;
    if (action.endsWith(".create")) {
      return levelChange(undefined, level);
    }
    if (action.endsWith(".delete")) {
      return `${levelChange(undefined, level)} を削除`;
    }
    return levelChange(before?.level, after?.level);
  }
  if (action === "skill.level_guides.update") {
    return diffRows.map((row) => `Lv${row.field}`).join("・");
  }
  if (action === "role.requirement.set" && !before) {
    return [
      levelChange(undefined, after?.requiredLevel),
      displayValue("isRequired", after?.isRequired),
    ].join("・");
  }
  if (action === "role.requirement.set") {
    const parts = [levelChange(before?.requiredLevel, after?.requiredLevel)];
    if (before?.isRequired !== after?.isRequired) {
      parts.push(
        `${displayValue("isRequired", before?.isRequired)} → ${displayValue(
          "isRequired",
          after?.isRequired,
        )}`,
      );
    }
    return parts.filter(Boolean).join("・");
  }
  if (action === "role.requirement.remove") {
    return "";
  }
  if (action.endsWith(".delete")) {
    return "";
  }
  if (action.endsWith(".create")) {
    const categoryId = after?.categoryId;
    return categoryId
      ? `カテゴリ：${displayValue("categoryId", categoryId, names)}`
      : "";
  }
  return diffRows.map((row) => row.label).join("、");
}

function csvTargetLabel(target: string) {
  const labels: Record<string, string> = {
    departments: "部署",
    members: "メンバー",
    skills: "スキル",
    "member-skills": "メンバースキル",
    roles: "ロール",
    "role-requirements": "ロール要件",
  };
  return labels[target] ?? "CSV";
}

export function resolveAuditTargetName(input: {
  targetType: string;
  targetId: string | null;
  memberId: string;
  skillId: string;
  before: JsonMap | null;
  after: JsonMap | null;
  names: NameMaps;
}) {
  const deleted = "（削除済み）";
  const savedName = String(input.before?.name ?? input.after?.name ?? deleted);
  switch (input.targetType) {
    case "Member":
      return input.names.members?.[input.targetId ?? ""] ?? savedName;
    case "Skill":
      return input.names.skills?.[input.targetId ?? ""] ?? savedName;
    case "SkillCategory":
      return input.names.categories?.[input.targetId ?? ""] ?? savedName;
    case "Role":
      return input.names.roles?.[input.targetId ?? ""] ?? savedName;
    case "MemberSkill":
    case "SkillSelfAssessment":
      return `${input.names.members?.[input.memberId] ?? deleted} の ${
        input.names.skills?.[input.skillId] ?? deleted
      }`;
    default:
      return deleted;
  }
}
