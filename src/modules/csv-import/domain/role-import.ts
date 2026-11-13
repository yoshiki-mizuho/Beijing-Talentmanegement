import { generateNextRoleCodeFromExistingCodes } from "@/modules/roles/domain/role-code";
import type { CsvImportError, CsvRecord } from "./csv-import-columns";
import { parseActive, requireValue } from "./csv-import-columns";

export type RoleImportState = {
  roles: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    requirements: Array<{
      id: string;
      skillId: string;
      requiredLevel: number;
      isRequired: boolean;
      anyOfGroup: number | null;
    }>;
  }>;
  skills: Array<{ id: string; code: string; name: string }>;
};

export type RoleImportChange = {
  row: number;
  kind: "new" | "update" | "unchanged" | "delete";
  entity: "role" | "requirement";
  id?: string;
  roleId?: string;
  skillId?: string;
  code: string;
  roleCode: string;
  name: string;
  roleName: string;
  description?: string | null;
  isActive?: boolean;
  requiredLevel?: number;
  isRequired?: boolean;
  anyOfGroup?: number | null;
  changes: Record<string, { before: unknown; after: unknown }>;
};

type PreparedRequirement = {
  record: CsvRecord;
  skillId: string;
  skillCode: string;
  skillName: string;
  requiredLevel: number;
  isRequired: boolean;
  anyOfGroup: number | null;
};

export function validateRoleImport(records: CsvRecord[], state: RoleImportState) {
  const errors: CsvImportError[] = [];
  const skills = new Map(state.skills.map((skill) => [skill.code, skill]));
  const rolesByCode = new Map(state.roles.map((role) => [role.code, role]));
  const rolesByName = new Map(state.roles.map((role) => [role.name, role]));
  const grouped = new Map<string, CsvRecord[]>();
  const assignedRoleCodes: string[] = [];

  for (const record of records) {
    requireValue(record, "role_name", errors);
    requireValue(record, "is_active", errors);
    parseActive(record, errors);
    if (record.values.role_name.length > 120) {
      add(errors, record, "role_name", "role_name は120文字以内にしてください");
    }
    if (record.values.description.length > 1000) {
      add(errors, record, "description", "description は1000文字以内にしてください");
    }
    if (
      record.values.role_code &&
      !rolesByCode.has(record.values.role_code)
    ) {
      add(
        errors,
        record,
        "role_code",
        `ロールコード ${record.values.role_code} が見つかりません。新しいロールはコードを空にしてください`,
      );
    }
    const requirementValues = [
      record.values.skill_code,
      record.values.required_level,
      record.values.is_required,
      record.values.any_of_group,
    ];
    if (!record.values.skill_code && requirementValues.some(Boolean)) {
      add(errors, record, "skill_code", "要件の値がある行は skill_code が必須です");
    }
    if (record.values.skill_code) {
      if (!skills.has(record.values.skill_code)) {
        add(
          errors,
          record,
          "skill_code",
          `スキルコード ${record.values.skill_code} が見つかりません`,
        );
      }
      const level = Number(record.values.required_level);
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        add(errors, record, "required_level", "required_level は1から5の整数にしてください");
      }
      if (!isBoolean(record.values.is_required)) {
        add(errors, record, "is_required", "is_required は true または false にしてください");
      }
      if (
        record.values.any_of_group &&
        (!Number.isInteger(Number(record.values.any_of_group)) ||
          Number(record.values.any_of_group) < 1)
      ) {
        add(errors, record, "any_of_group", "any_of_group は1以上の整数にしてください");
      }
    }
    const groupKey = record.values.role_code
      ? `code:${record.values.role_code}`
      : `name:${record.values.role_name}`;
    const rows = grouped.get(groupKey) ?? [];
    rows.push(record);
    grouped.set(groupKey, rows);
  }

  const changes: RoleImportChange[] = [];
  for (const roleRecords of grouped.values()) {
    const first = roleRecords[0];
    const roleCode = first.values.role_code;
    const roleName = first.values.role_name;
    const description = first.values.description || null;
    const isActive = first.values.is_active.toLowerCase() === "true";
    for (const record of roleRecords.slice(1)) {
      if (record.values.role_name !== first.values.role_name) {
        add(errors, record, "role_name", "同じロールの role_name が行によって異なります");
      }
      if (record.values.description !== first.values.description) {
        add(errors, record, "description", "同じロールの description が行によって異なります");
      }
      if (record.values.is_active.toLowerCase() !== first.values.is_active.toLowerCase()) {
        add(errors, record, "is_active", "同じロールの is_active が行によって異なります");
      }
    }
    const emptyRows = roleRecords.filter((record) => !record.values.skill_code);
    if (emptyRows.length > 0 && emptyRows.length !== roleRecords.length) {
      for (const record of roleRecords) {
        add(errors, record, "skill_code", "要件なしの行と要件のある行を混在できません");
      }
    }
    const seenSkills = new Set<string>();
    const requirements: PreparedRequirement[] = [];
    for (const record of roleRecords.filter((item) => item.values.skill_code)) {
      const skillCode = record.values.skill_code;
      if (seenSkills.has(skillCode)) {
        add(errors, record, "skill_code", "同じロールのスキルがCSV内で重複しています");
      }
      seenSkills.add(skillCode);
      const skill = skills.get(skillCode);
      if (!skill) continue;
      requirements.push({
        record,
        skillId: skill.id,
        skillCode,
        skillName: skill.name,
        requiredLevel: Number(record.values.required_level),
        isRequired: record.values.is_required.toLowerCase() === "true",
        anyOfGroup: record.values.any_of_group
          ? Number(record.values.any_of_group)
          : null,
      });
    }
    const groupCounts = new Map<number, number>();
    for (const requirement of requirements) {
      if (requirement.anyOfGroup !== null) {
        groupCounts.set(
          requirement.anyOfGroup,
          (groupCounts.get(requirement.anyOfGroup) ?? 0) + 1,
        );
      }
    }
    for (const requirement of requirements) {
      if (
        requirement.anyOfGroup !== null &&
        groupCounts.get(requirement.anyOfGroup) === 1
      ) {
        add(
          errors,
          requirement.record,
          "any_of_group",
          "いずれかの組には、スキルを2つ以上入れてください",
        );
      }
    }
    if (errors.some((error) => roleRecords.some((record) => record.row === error.row))) {
      continue;
    }

    const current = roleCode ? rolesByCode.get(roleCode) : undefined;
    const nameConflict = rolesByName.get(roleName);
    if (!current && nameConflict) {
      add(
        errors,
        first,
        "role_name",
        "同じ名前のロールがあります。更新するときは role_code を指定してください",
      );
      continue;
    }
    if (current && nameConflict && nameConflict.id !== current.id) {
      add(errors, first, "role_name", "同じ名前のロールがあります");
      continue;
    }
    const resolvedRoleCode = current?.code ?? generateNextRoleCodeFromExistingCodes([
      ...state.roles.map((role) => role.code),
      ...assignedRoleCodes,
    ]);
    if (!current) assignedRoleCodes.push(resolvedRoleCode);
    const roleDiff: RoleImportChange["changes"] = {};
    if (current) {
      addDiff(roleDiff, "name", current.name, roleName);
      addDiff(roleDiff, "description", current.description, description);
      addDiff(roleDiff, "isActive", current.isActive, isActive);
    }
    changes.push({
      row: first.row,
      kind: !current ? "new" : Object.keys(roleDiff).length ? "update" : "unchanged",
      entity: "role",
      id: current?.id,
      code: resolvedRoleCode,
      roleCode: resolvedRoleCode,
      name: roleName,
      roleName,
      description,
      isActive,
      changes: roleDiff,
    });

    const currentRequirements = new Map(
      (current?.requirements ?? []).map((requirement) => [requirement.skillId, requirement]),
    );
    for (const requirement of requirements) {
      const existing = currentRequirements.get(requirement.skillId);
      currentRequirements.delete(requirement.skillId);
      const diff: RoleImportChange["changes"] = {};
      if (existing) {
        addDiff(diff, "requiredLevel", existing.requiredLevel, requirement.requiredLevel);
        addDiff(diff, "isRequired", existing.isRequired, requirement.isRequired);
        addDiff(diff, "anyOfGroup", existing.anyOfGroup, requirement.anyOfGroup);
      }
      changes.push({
        row: requirement.record.row,
        kind: !existing ? "new" : Object.keys(diff).length ? "update" : "unchanged",
        entity: "requirement",
        id: existing?.id,
        roleId: current?.id,
        skillId: requirement.skillId,
        code: `${roleName} / ${requirement.skillCode}`,
        roleCode: resolvedRoleCode,
        name: `${roleName} / ${requirement.skillName}`,
        roleName,
        requiredLevel: requirement.requiredLevel,
        isRequired: requirement.isRequired,
        anyOfGroup: requirement.anyOfGroup,
        changes: diff,
      });
    }
    for (const existing of currentRequirements.values()) {
      const skill = state.skills.find((item) => item.id === existing.skillId);
      changes.push({
        row: first.row,
        kind: "delete",
        entity: "requirement",
        id: existing.id,
        roleId: current?.id,
        skillId: existing.skillId,
        code: `${roleName} / ${skill?.code ?? existing.skillId}`,
        roleCode: resolvedRoleCode,
        name: `${roleName} / ${skill?.name ?? existing.skillId}`,
        roleName,
        requiredLevel: existing.requiredLevel,
        isRequired: existing.isRequired,
        anyOfGroup: existing.anyOfGroup,
        changes: {},
      });
    }
  }
  return { changes, errors };
}

function isBoolean(value: string) {
  return value.toLowerCase() === "true" || value.toLowerCase() === "false";
}

function addDiff(
  changes: RoleImportChange["changes"],
  field: string,
  before: unknown,
  after: unknown,
) {
  if (before !== after) changes[field] = { before, after };
}

function add(
  errors: CsvImportError[],
  record: CsvRecord,
  column: string,
  message: string,
) {
  errors.push({ row: record.row, column, message });
}
