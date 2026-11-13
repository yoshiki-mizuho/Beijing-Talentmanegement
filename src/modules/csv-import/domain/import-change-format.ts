const fieldLabels: Record<string, string> = {
  name: "名前",
  parentCode: "親部署コード",
  categoryName: "カテゴリ",
  description: "説明",
  isActive: "状態",
  email: "メールアドレス",
  departmentCode: "部署コード",
  jobTitle: "役職",
  status: "在籍状態",
  managerEmployeeNo: "上司の社員番号",
  targetRoleName: "目標ロール",
  level: "レベル",
  yearsOfExperience: "経験年数",
  lastAssessedAt: "最終評価日",
  requiredLevel: "必要レベル",
  isRequired: "必須",
  anyOfGroup: "ORの組",
  levelGuide1: "Lv1 の目安",
  levelGuide2: "Lv2 の目安",
  levelGuide3: "Lv3 の目安",
  levelGuide4: "Lv4 の目安",
  levelGuide5: "Lv5 の目安",
};

function formatValue(value: unknown) {
  if (value === true) return "有効";
  if (value === false) return "無効";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export type ImportChangeLine = {
  label: string;
  before: string;
  after: string;
};

// 確認の画面で、差分を「項目：変更前 → 変更後」の形で読めるようにする
export function formatImportChanges(
  changes: Record<string, { before: unknown; after: unknown }>,
): ImportChangeLine[] {
  return Object.entries(changes).map(([field, value]) => ({
    label: fieldLabels[field] ?? field,
    before: formatValue(value.before),
    after: formatValue(value.after),
  }));
}
