import { MemberStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { resolveMemberProfiles } from "@/modules/members/application/member-directory";
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
    case "skills":
      return prisma.skill.findMany({
        select: {
          code: true,
          name: true,
          category: { select: { name: true } },
          description: true,
          isActive: true,
          levelGuides: {
            select: { level: true, description: true },
            orderBy: { level: "asc" },
          },
        },
        orderBy: { code: "asc" },
      }) as Promise<CsvExportRows[T]>;
    case "member-skills":
      const rows = await prisma.memberSkill.findMany({
        where: { member: memberWhere },
        select: {
          member: { select: { id: true } },
          skill: { select: { code: true } },
          level: true,
          yearsOfExperience: true,
          lastAssessedAt: true,
        },
        orderBy: [{ memberId: "asc" }, { skill: { code: "asc" } }],
      });
      const profiles = await resolveMemberProfiles(
        rows.map((row) => row.member.id),
      );
      return rows.map((row) => ({
        ...row,
        email: profiles.get(row.member.id)?.email ?? "",
      })) as CsvExportRows[T];
    case "roles":
      return prisma.role.findMany({
        select: {
          code: true,
          name: true,
          description: true,
          isActive: true,
          roleRequirements: {
            select: {
              skill: { select: { code: true } },
              requiredLevel: true,
              isRequired: true,
              anyOfGroup: true,
            },
            orderBy: { skill: { code: "asc" } },
          },
        },
        orderBy: { name: "asc" },
      }) as Promise<CsvExportRows[T]>;
  }
}

export async function loadCsvExportCounts(scope: CsvExportScope) {
  const memberWhere = scope === "active" ? activeMemberWhere : {};
  const [skills, memberSkills, roles, roleRequirements] =
    await Promise.all([
      prisma.skill.count(),
      prisma.memberSkill.count({ where: { member: memberWhere } }),
      prisma.role.count(),
      prisma.roleRequirement.count(),
    ]);
  return {
    skills,
    "member-skills": memberSkills,
    roles: { roles, requirements: roleRequirements },
  };
}
