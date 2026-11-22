export const csvExportTargets = [
  "skills",
  "member-skills",
  "roles",
] as const;

export type CsvExportTarget = (typeof csvExportTargets)[number];
export type CsvExportScope = "active" | "all";

export const csvExportDefinitions = {
  skills: {
    label: "スキル",
    columns: [
      "skill_code",
      "skill_name",
      "category_name",
      "description",
      "is_active",
      "level_guide_1",
      "level_guide_2",
      "level_guide_3",
      "level_guide_4",
      "level_guide_5",
    ],
  },
  "member-skills": {
    label: "メンバースキル",
    columns: [
      "email",
      "skill_code",
      "level",
      "years_of_experience",
      "last_assessed_at",
    ],
  },
  roles: {
    label: "ロール",
    columns: [
      "role_code",
      "role_name",
      "description",
      "is_active",
      "skill_code",
      "required_level",
      "is_required",
      "any_of_group",
    ],
  },
} as const satisfies Record<
  CsvExportTarget,
  { label: string; columns: readonly string[] }
>;

export type CsvExportRows = {
  skills: Array<{
    code: string;
    name: string;
    category: { name: string };
    description: string | null;
    isActive: boolean;
    levelGuides: Array<{ level: number; description: string }>;
  }>;
  "member-skills": Array<{
    member: { id: string };
    email: string;
    skill: { code: string };
    level: number;
    yearsOfExperience: { toString(): string } | null;
    lastAssessedAt: Date | null;
  }>;
  roles: Array<{
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    roleRequirements: Array<{
      skill: { code: string };
      requiredLevel: number;
      isRequired: boolean;
      anyOfGroup?: number | null;
    }>;
  }>;
};

export function isCsvExportTarget(value: string): value is CsvExportTarget {
  return csvExportTargets.includes(value as CsvExportTarget);
}

export function toCsvExportRows<T extends CsvExportTarget>(
  target: T,
  rows: CsvExportRows[T],
): unknown[][] {
  switch (target) {
    case "skills":
      return (rows as CsvExportRows["skills"]).map((row) => [
        row.code,
        row.name,
        row.category.name,
        row.description ?? "",
        row.isActive,
        ...[1, 2, 3, 4, 5].map(
          (level) =>
            row.levelGuides.find((guide) => guide.level === level)?.description ?? "",
        ),
      ]);
    case "member-skills":
      return (rows as CsvExportRows["member-skills"]).map((row) => [
        row.email,
        row.skill.code,
        row.level,
        row.yearsOfExperience?.toString() ?? "",
        formatDate(row.lastAssessedAt),
      ]);
    case "roles":
      return (rows as CsvExportRows["roles"]).flatMap((row) => {
        const requirements = row.roleRequirements.length
          ? row.roleRequirements
          : [{ skill: null, requiredLevel: null, isRequired: null, anyOfGroup: null }];
        return requirements.map((requirement) => [
          row.code,
          row.name,
          row.description ?? "",
          row.isActive,
          requirement.skill?.code ?? "",
          requirement.requiredLevel ?? "",
          requirement.isRequired ?? "",
          requirement.anyOfGroup ?? "",
        ]);
      });
  }
}

function formatDate(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}
