import type { CsvImportError, CsvRecord } from "./csv-import-columns";
import { requireValue } from "./csv-import-columns";

export type MemberSkillImportState = {
  members: Array<{ id: string; employeeNo: string; name: string }>;
  skills: Array<{ id: string; code: string; name: string; isActive: boolean }>;
  memberSkills: Array<{
    id: string;
    memberId: string;
    skillId: string;
    level: number;
    yearsOfExperience: string | null;
    lastAssessedAt: string | null;
  }>;
};
export type MemberSkillChange = {
  row: number;
  kind: "new" | "update" | "unchanged";
  id?: string;
  code: string;
  name: string;
  memberId: string;
  skillId: string;
  level: number;
  yearsOfExperience: string | null;
  lastAssessedAt: string | null;
  changes: Record<string, { before: unknown; after: unknown }>;
};

export function validateMemberSkillImport(
  records: CsvRecord[],
  state: MemberSkillImportState,
) {
  const errors: CsvImportError[] = [];
  const members = new Map(state.members.map((item) => [item.employeeNo, item]));
  const skills = new Map(state.skills.map((item) => [item.code, item]));
  const existing = new Map(
    state.memberSkills.map((item) => [
      `${item.memberId}\0${item.skillId}`,
      item,
    ]),
  );
  const seen = new Set<string>();
  const changes: MemberSkillChange[] = [];
  for (const record of records) {
    for (const field of ["employee_no", "skill_code", "level"])
      requireValue(record, field, errors);
    const member = members.get(record.values.employee_no);
    const skill = skills.get(record.values.skill_code);
    const key = `${record.values.employee_no}\0${record.values.skill_code}`;
    if (!member)
      add(
        errors,
        record,
        "employee_no",
        `社員番号 ${record.values.employee_no} が見つかりません`,
      );
    if (!skill)
      add(
        errors,
        record,
        "skill_code",
        `スキルコード ${record.values.skill_code} が見つかりません`,
      );
    else if (!skill.isActive)
      add(
        errors,
        record,
        "skill_code",
        `スキル ${record.values.skill_code} は無効です`,
      );
    if (seen.has(key))
      add(
        errors,
        record,
        "skill_code",
        "同じメンバーとスキルがCSV内で重複しています",
      );
    seen.add(key);
    const level = Number(record.values.level);
    if (!Number.isInteger(level) || level < 1 || level > 5)
      add(errors, record, "level", "level は1から5の整数にしてください");
    const years = record.values.years_of_experience || null;
    if (years && (!/^\d{1,2}(\.\d)?$/.test(years) || Number(years) > 99.9))
      add(
        errors,
        record,
        "years_of_experience",
        "経験年数は0以上99.9以下、小数第1位までにしてください",
      );
    const date = record.values.last_assessed_at || null;
    if (date && !isValidDate(date))
      add(
        errors,
        record,
        "last_assessed_at",
        "最終評価日は実在する YYYY-MM-DD にしてください",
      );
    if (!member || !skill || errors.some((error) => error.row === record.row))
      continue;
    const current = existing.get(`${member.id}\0${skill.id}`);
    const value = {
      row: record.row,
      code: key,
      name: `${member.name}（${member.employeeNo}） の ${skill.name}`,
      memberId: member.id,
      skillId: skill.id,
      level,
      yearsOfExperience: years,
      lastAssessedAt: date,
    };
    if (!current) changes.push({ ...value, kind: "new", changes: {} });
    else {
      const diff: MemberSkillChange["changes"] = {};
      for (const [field, before, after] of [
        ["level", current.level, level],
        ["yearsOfExperience", current.yearsOfExperience, years],
        ["lastAssessedAt", current.lastAssessedAt, date],
      ] as const)
        if (before !== after) diff[field] = { before, after };
      changes.push({
        ...value,
        id: current.id,
        kind: Object.keys(diff).length ? "update" : "unchanged",
        changes: diff,
      });
    }
  }
  return { changes, errors };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function add(
  errors: CsvImportError[],
  record: CsvRecord,
  column: string,
  message: string,
) {
  errors.push({ row: record.row, column, message });
}
