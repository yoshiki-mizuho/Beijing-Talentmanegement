import { MemberStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type {
  CsvExportRows,
  CsvExportScope,
  CsvExportTarget,
} from "../domain/csv-export-columns";

const activeMemberWhere = { status: MemberStatus.ACTIVE } as const;

export async function loadCsvExportRows<T extends CsvExportTarget>(
  target: T,
  scope: CsvExportScope,
): Promise<CsvExportRows[T]> {
  const memberWhere = scope === "active" ? activeMemberWhere : {};
  switch (target) {
    case "departments":
      return prisma.department.findMany({
        select: {
          code: true,
          name: true,
          parentDepartment: { select: { code: true } },
          isActive: true,
        },
        orderBy: { code: "asc" },
      }) as Promise<CsvExportRows[T]>;
    case "members":
      return prisma.member.findMany({
        where: memberWhere,
        select: {
          employeeNo: true,
          name: true,
          email: true,
          department: { select: { code: true } },
          jobTitle: true,
          status: true,
          manager: { select: { employeeNo: true } },
          targetRole: { select: { name: true } },
        },
        orderBy: { employeeNo: "asc" },
      }) as Promise<CsvExportRows[T]>;
    case "skills":
      return prisma.skill.findMany({
        select: {
          code: true,
          name: true,
          category: { select: { name: true } },
          description: true,
          isActive: true,
        },
        orderBy: { code: "asc" },
      }) as Promise<CsvExportRows[T]>;
    case "member-skills":
      return prisma.memberSkill.findMany({
        where: { member: memberWhere },
        select: {
          member: { select: { employeeNo: true } },
          skill: { select: { code: true } },
          level: true,
          yearsOfExperience: true,
          lastAssessedAt: true,
        },
        orderBy: [
          { member: { employeeNo: "asc" } },
          { skill: { code: "asc" } },
        ],
      }) as Promise<CsvExportRows[T]>;
    case "roles":
      return prisma.role.findMany({
        select: { name: true, description: true, isActive: true },
        orderBy: { name: "asc" },
      }) as Promise<CsvExportRows[T]>;
    case "role-requirements":
      return prisma.roleRequirement.findMany({
        select: {
          role: { select: { name: true } },
          skill: { select: { code: true } },
          requiredLevel: true,
          isRequired: true,
        },
        orderBy: [{ role: { name: "asc" } }, { skill: { code: "asc" } }],
      }) as Promise<CsvExportRows[T]>;
  }
}

export async function loadCsvExportCounts(scope: CsvExportScope) {
  const memberWhere = scope === "active" ? activeMemberWhere : {};
  const [departments, members, skills, memberSkills, roles, roleRequirements] =
    await Promise.all([
      prisma.department.count(),
      prisma.member.count({ where: memberWhere }),
      prisma.skill.count(),
      prisma.memberSkill.count({ where: { member: memberWhere } }),
      prisma.role.count(),
      prisma.roleRequirement.count(),
    ]);
  return {
    departments,
    members,
    skills,
    "member-skills": memberSkills,
    roles,
    "role-requirements": roleRequirements,
  } satisfies Record<CsvExportTarget, number>;
}
