export const singleSkillSheetMarkers = [
  "氏名",
  "IT経験年数",
  "得意分野",
  "自己PR",
  "資格",
  "作成日"
] as const;

export const repeatingSkillSheetMarkers = {
  経歴: ["期間", "案件名", "説明", "業種", "役割", "規模", "業務領域", "工程", "技術"],
  スキル: ["名前", "レベル", "カテゴリ"],
  資格: ["名前", "取得年月"]
} as const;

export type RepeatingMarkerGroup = keyof typeof repeatingSkillSheetMarkers;
export type SkillSheetMarkerValues = Record<string, string>;
export type SkillSheetRepeatingValues = Record<RepeatingMarkerGroup, SkillSheetMarkerValues[]>;

export const skillSheetMarkerNames = [
  ...singleSkillSheetMarkers,
  ...Object.entries(repeatingSkillSheetMarkers).flatMap(([group, items]) =>
    items.map((item) => `${group}.${item}`)
  )
] as const;

const markerPattern = /\{\{\s*([^{}]+?)\s*\}\}/gu;
const knownMarkers = new Set<string>(skillSheetMarkerNames);

export function extractMarkers(value: string) {
  return [...value.matchAll(markerPattern)].map((match) => ({
    raw: match[0],
    name: match[1].trim()
  }));
}

export function inspectMarkerRows(rows: ReadonlyArray<ReadonlyArray<string>>) {
  const known = new Set<string>();
  const unknown = new Set<string>();
  const errors: string[] = [];

  rows.forEach((cells, rowIndex) => {
    const groups = new Set<string>();
    for (const cell of cells) {
      for (const marker of extractMarkers(cell)) {
        if (knownMarkers.has(marker.name)) known.add(marker.name);
        else unknown.add(marker.raw);
        const group = repeatingGroupOf(marker.name);
        if (group) groups.add(group);
      }
    }
    if (groups.size > 1) {
      errors.push(`${rowIndex + 1}行目に複数の繰り返しグループがあります。`);
    }
  });

  return { known: [...known], unknown: [...unknown], errors };
}

export function repeatingGroupForRow(cells: ReadonlyArray<string>): RepeatingMarkerGroup | null {
  for (const cell of cells) {
    for (const marker of extractMarkers(cell)) {
      const group = repeatingGroupOf(marker.name);
      if (group) return group;
    }
  }
  return null;
}

// 「経歴.期間」のように「グループ.項目」の形の印だけを繰り返しの印とする（{{資格}} は1回だけの印）
function repeatingGroupOf(name: string): RepeatingMarkerGroup | null {
  const separator = name.indexOf(".");
  if (separator < 0) return null;
  const group = name.slice(0, separator);
  return group in repeatingSkillSheetMarkers ? (group as RepeatingMarkerGroup) : null;
}

export function countRepeatingSets(cells: ReadonlyArray<string>, group: RepeatingMarkerGroup) {
  const seen = new Set<string>();
  let sets = 1;
  let found = false;
  for (const cell of cells) {
    for (const marker of extractMarkers(cell)) {
      if (!marker.name.startsWith(`${group}.`)) continue;
      found = true;
      if (seen.has(marker.name)) {
        sets += 1;
        seen.clear();
      }
      seen.add(marker.name);
    }
  }
  return found ? sets : 0;
}

export function replaceMarkers(value: string, values: SkillSheetMarkerValues) {
  return value.replace(markerPattern, (_match, name: string) => values[name.trim()] ?? "");
}
