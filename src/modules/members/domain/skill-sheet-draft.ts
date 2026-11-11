export type SkillSheetDraft = {
  version: 1;
  selectedLevels: Record<string, number>;
  comments: Record<string, string>;
};

type SkillSheetDraftRow = {
  skillId: string;
  currentLevel: number | null;
  pendingLevel: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSkillSheetDraft(
  value: string,
  rows: SkillSheetDraftRow[]
): SkillSheetDraft | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !isRecord(parsed.selectedLevels) ||
    !isRecord(parsed.comments)
  ) {
    return null;
  }

  const rowsBySkillId = new Map(rows.map((row) => [row.skillId, row]));
  const selectedLevels: Record<string, number> = {};
  const comments: Record<string, string> = {};

  for (const [skillId, level] of Object.entries(parsed.selectedLevels)) {
    const row = rowsBySkillId.get(skillId);
    if (
      !row ||
      row.pendingLevel !== null ||
      !Number.isInteger(level) ||
      (level as number) < 1 ||
      (level as number) > 5 ||
      level === row.currentLevel
    ) {
      continue;
    }

    selectedLevels[skillId] = level as number;
    const comment = parsed.comments[skillId];
    if (typeof comment === "string" && comment.length <= 200) {
      comments[skillId] = comment;
    }
  }

  return { version: 1, selectedLevels, comments };
}
