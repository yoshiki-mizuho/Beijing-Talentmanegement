export const csvExportTargets = [
  "departments",
  "members",
  "skills",
  "member-skills",
  "roles",
] as const;

export type CsvExportTarget = (typeof csvExportTargets)[number];
export type CsvExportScope = "active" | "all";

export const csvExportDefinitions = {
  departments: {
    label: "部署",
    columns: [
      "department_code",
      "department_name",
      "parent_department_code",
      "is_active",
    ],
  },
  members: {
    label: "メンバー",
    columns: [
      "employee_no",
      "name",
      "email",
      "department_code",
      "job_title",
      "status",
      "manager_employee_no",
      "target_role_name",
    ],
  },
  skills: {
    label: "スキル",
    columns: [
      "skill_code",
      "skill_name",
      "category_name",
      "description",
      "is_active",
    ],
  },
  "member-skills": {
    label: "メンバースキル",
    columns: [
      "employee_no",
      "skill_code",
      "level",
      "years_of_experience",
      "last_assessed_at",
    ],
  },
  roles: {
    label: "ロール",
    columns: [
      "role_name",
      "description",
      "is_active",
      "skill_code",
      "required_level",
      "is_required",
    ],
  },
} as const satisfies Record<
  CsvExportTarget,
  { label: string; columns: readonly string[] }
>;

type RelatedCode = { code: string } | null;
type RelatedName = { name: string } | null;
type RelatedEmployee = { employeeNo: string } | null;

export type CsvExportRows = {
  departments: Array<{
    code: string;
    name: string;
    parentDepartment: RelatedCode;
    isActive: boolean;
  }>;
  members: Array<{
    employeeNo: string;
    name: string;
    email: string;
    department: { code: string };
    jobTitle: string | null;
    status: string;
    manager: RelatedEmployee;
    targetRole: RelatedName;
  }>;
  skills: Array<{
    code: string;
    name: string;
    category: { name: string };
    description: string | null;
    isActive: boolean;
  }>;
  "member-skills": Array<{
    member: { employeeNo: string };
    skill: { code: string };
    level: number;
    yearsOfExperience: { toString(): string } | null;
    lastAssessedAt: Date | null;
  }>;
  roles: Array<{
    name: string;
    description: string | null;
    isActive: boolean;
    roleRequirements: Array<{
      skill: { code: string };
      requiredLevel: number;
      isRequired: boolean;
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
    case "departments":
      return (rows as CsvExportRows["departments"]).map((row) => [
        row.code,
        row.name,
        row.parentDepartment?.code ?? "",
        row.isActive,
      ]);
    case "members":
      return (rows as CsvExportRows["members"]).map((row) => [
        row.employeeNo,
        row.name,
        row.email,
        row.department.code,
        row.jobTitle ?? "",
        row.status.toLowerCase(),
        row.manager?.employeeNo ?? "",
        row.targetRole?.name ?? "",
      ]);
    case "skills":
      return (rows as CsvExportRows["skills"]).map((row) => [
        row.code,
        row.name,
        row.category.name,
        row.description ?? "",
        row.isActive,
      ]);
    case "member-skills":
      return (rows as CsvExportRows["member-skills"]).map((row) => [
        row.member.employeeNo,
        row.skill.code,
        row.level,
        row.yearsOfExperience?.toString() ?? "",
        formatDate(row.lastAssessedAt),
      ]);
    case "roles":
      return (rows as CsvExportRows["roles"]).flatMap((row) => {
        const requirements = row.roleRequirements.length
          ? row.roleRequirements
          : [{ skill: null, requiredLevel: null, isRequired: null }];
        return requirements.map((requirement) => [
          row.name,
          row.description ?? "",
          row.isActive,
          requirement.skill?.code ?? "",
          requirement.requiredLevel ?? "",
          requirement.isRequired ?? "",
        ]);
      });
  }
}

function formatDate(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}
