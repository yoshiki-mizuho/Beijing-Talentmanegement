import { generateNextSkillCodeFromExistingCodes } from "@/modules/skills/domain/skill-code";
import type { CsvImportError, CsvRecord } from "./csv-import-columns";
import { parseActive, requireValue } from "./csv-import-columns";

export type SkillState = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string | null;
  isActive: boolean;
};
export type SkillCategoryState = { id: string; name: string };
export type SkillChange = {
  row: number;
  kind: "new" | "update" | "unchanged";
  id?: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string | null;
  isActive: boolean;
  changes: Record<string, { before: unknown; after: unknown }>;
};

export function validateSkillImport(
  records: CsvRecord[],
  existing: SkillState[],
  categories: SkillCategoryState[],
) {
  const errors: CsvImportError[] = [];
  const existingByCode = new Map(existing.map((item) => [item.code, item]));
  const categoryByName = new Map(categories.map((item) => [item.name, item]));
  const categoryNameById = new Map(
    categories.map((item) => [item.id, item.name]),
  );
  const seenCodes = new Set<string>();
  const assignedCodes: string[] = [];
  const allCodes = existing.map((item) => item.code);
  const prepared = records.map((record) => {
    requireValue(record, "skill_name", errors);
    requireValue(record, "category_name", errors);
    requireValue(record, "is_active", errors);
    parseActive(record, errors);
    let code = record.values.skill_code;
    if (!code) {
      code = generateNextSkillCodeFromExistingCodes([
        ...allCodes,
        ...assignedCodes,
      ]);
      assignedCodes.push(code);
    } else if (!existingByCode.has(code)) {
      errors.push({
        row: record.row,
        column: "skill_code",
        message: `スキルコード ${code} が見つかりません。新しいスキルはコードを空にしてください`,
      });
    }
    if (seenCodes.has(code)) {
      errors.push({
        row: record.row,
        column: "skill_code",
        message: `スキルコード ${code} がCSV内で重複しています`,
      });
    }
    seenCodes.add(code);
    const category = categoryByName.get(record.values.category_name);
    if (!category) {
      errors.push({
        row: record.row,
        column: "category_name",
        message: `カテゴリ ${record.values.category_name} が見つかりません`,
      });
    }
    return { record, code, category };
  });
  const names = new Map<string, number>();
  for (const item of prepared) {
    if (!item.category) {
      continue;
    }
    const key = `${item.category.id}\u0000${item.record.values.skill_name}`;
    if (names.has(key)) {
      errors.push({
        row: item.record.row,
        column: "skill_name",
        message: "同じカテゴリのスキル名がCSV内で重複しています",
      });
    }
    names.set(key, item.record.row);
    const conflict = existing.find(
      (skill) =>
        skill.categoryId === item.category?.id &&
        skill.name === item.record.values.skill_name &&
        skill.code !== item.code,
    );
    if (conflict) {
      errors.push({
        row: item.record.row,
        column: "skill_name",
        message: "同じカテゴリに同じ名前のスキルがあります",
      });
    }
  }
  const invalidRows = new Set(errors.map((error) => error.row));
  const changes = prepared.flatMap((item): SkillChange[] => {
    if (!item.category || invalidRows.has(item.record.row)) {
      return [];
    }
    const current = existingByCode.get(item.code);
    const name = item.record.values.skill_name;
    const description = item.record.values.description || null;
    const isActive = item.record.values.is_active.toLowerCase() === "true";
    if (!current) {
      return [
        {
          row: item.record.row,
          kind: "new",
          code: item.code,
          name,
          categoryId: item.category.id,
          categoryName: item.category.name,
          description,
          isActive,
          changes: {},
        },
      ];
    }
    const diff: SkillChange["changes"] = {};
    addDiff(diff, "name", current.name, name);
    // 確認の画面と監査ログで読めるよう、カテゴリは名前で差分を取る
    addDiff(
      diff,
      "categoryName",
      categoryNameById.get(current.categoryId) ?? null,
      item.category.name,
    );
    addDiff(diff, "description", current.description, description);
    addDiff(diff, "isActive", current.isActive, isActive);
    return [
      {
        row: item.record.row,
        kind: Object.keys(diff).length ? "update" : "unchanged",
        id: current.id,
        code: item.code,
        name,
        categoryId: item.category.id,
        categoryName: item.category.name,
        description,
        isActive,
        changes: diff,
      },
    ];
  });
  return { changes, errors };
}

function addDiff(
  diff: SkillChange["changes"],
  field: string,
  before: unknown,
  after: unknown,
) {
  if (before !== after) {
    diff[field] = { before, after };
  }
}
