import {
  CsvImportStatus,
  CsvImportTargetType,
  Prisma,
  SkillLevelChangeSource,
} from "@prisma/client";
import {
  AUDIT_ACTION,
  AUDIT_TARGET_TYPE,
} from "@/modules/audit/domain/audit-action";
import { diffForAudit } from "@/modules/audit/domain/audit-diff";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { prisma } from "@/server/db/prisma";
import {
  createMemberWithUser,
  hashInitialPassword,
} from "@/modules/members/infrastructure/member-repository";
import type {
  DepartmentChange,
  DepartmentState,
} from "../domain/department-import";
import type { CsvImportTarget } from "../domain/csv-import-columns";
import type { MemberChange, MemberImportState } from "../domain/member-import";
import type {
  MemberSkillChange,
  MemberSkillImportState,
} from "../domain/member-skill-import";
import type {
  SkillCategoryState,
  SkillChange,
  SkillState,
} from "../domain/skill-import";
import type { RoleImportChange, RoleImportState } from "../domain/role-import";

export async function recordCsvImportValidationFailure(input: {
  actorMemberId: string;
  target: CsvImportTarget;
  stage: "preview" | "commit";
  originalName?: string;
  totalRows?: number;
  errors: Array<{ row?: number; column?: string; message: string }>;
}) {
  try {
    await prisma.$transaction((tx) =>
      recordAuditLog(tx, {
        actorMemberId: input.actorMemberId,
        action: AUDIT_ACTION.CSV_IMPORT_FAILED,
        targetType: AUDIT_TARGET_TYPE.CSV,
        targetId: null,
        metadata: {
          target: input.target,
          stage: input.stage,
          ...(input.originalName ? { originalName: input.originalName } : {}),
          ...(input.totalRows === undefined
            ? {}
            : { totalRows: input.totalRows }),
          errorCount: input.errors.length,
          errors: input.errors.slice(0, 5).map((error) => ({
            ...(error.row === undefined ? {} : { row: error.row }),
            ...(error.column === undefined ? {} : { column: error.column }),
            message: error.column
              ? `${error.column} の検証に失敗しました`
              : error.message,
          })),
        },
      }),
    );
  } catch {
    // 監査ログの失敗で、利用者へ返す CSV の結果は変えない。
  }
}

export async function loadDepartmentImportState(): Promise<DepartmentState[]> {
  const rows = await prisma.department.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      parentDepartment: { select: { code: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    parentCode: row.parentDepartment?.code ?? null,
    isActive: row.isActive,
  }));
}

export async function loadSkillImportState(): Promise<{
  skills: SkillState[];
  categories: SkillCategoryState[];
}> {
  const [skills, categories] = await Promise.all([
    prisma.skill.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
        category: { select: { name: true } },
        description: true,
        isActive: true,
        levelGuides: {
          select: { level: true, description: true },
          orderBy: { level: "asc" },
        },
      },
    }),
    prisma.skillCategory.findMany({ select: { id: true, name: true } }),
  ]);
  return {
    skills: skills.map((skill) => ({
      ...skill,
      categoryName: skill.category.name,
    })),
    categories,
  };
}

export async function loadMemberImportState(): Promise<MemberImportState> {
  const [members, departments, roles] = await Promise.all([
    prisma.member.findMany({
      select: {
        id: true,
        employeeNo: true,
        name: true,
        email: true,
        departmentId: true,
        department: { select: { code: true } },
        jobTitle: true,
        status: true,
        managerId: true,
        manager: { select: { employeeNo: true } },
        targetRoleId: true,
        targetRole: { select: { name: true } },
        users: { select: { role: true } },
      },
    }),
    prisma.department.findMany({ select: { id: true, code: true } }),
    prisma.role.findMany({ select: { id: true, name: true, isActive: true } }),
  ]);
  return {
    members: members.map((member) => ({
      ...member,
      departmentCode: member.department.code,
      managerEmployeeNo: member.manager?.employeeNo ?? null,
      targetRoleName: member.targetRole?.name ?? null,
      canManage: member.users.some(
        (user) => user.role === "ADMIN" || user.role === "MANAGER",
      ),
    })),
    departments,
    roles,
  };
}

export async function loadMemberSkillImportState(): Promise<MemberSkillImportState> {
  const [members, skills, memberSkills] = await Promise.all([
    prisma.member.findMany({
      select: { id: true, employeeNo: true, name: true },
    }),
    prisma.skill.findMany({
      select: { id: true, code: true, name: true, isActive: true },
    }),
    prisma.memberSkill.findMany({
      select: {
        id: true,
        memberId: true,
        skillId: true,
        level: true,
        yearsOfExperience: true,
        lastAssessedAt: true,
      },
    }),
  ]);
  return {
    members,
    skills,
    memberSkills: memberSkills.map((item) => ({
      ...item,
      yearsOfExperience: item.yearsOfExperience?.toString() ?? null,
      lastAssessedAt: item.lastAssessedAt?.toISOString().slice(0, 10) ?? null,
    })),
  };
}

export async function loadRoleImportState(): Promise<RoleImportState> {
  const [roles, skills] = await Promise.all([
    prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        roleRequirements: {
          select: {
            id: true,
            skillId: true,
            requiredLevel: true,
            isRequired: true,
            anyOfGroup: true,
          },
        },
      },
    }),
    prisma.skill.findMany({ select: { id: true, code: true, name: true } }),
  ]);
  return {
    roles: roles.map((role) => ({
      ...role,
      requirements: role.roleRequirements,
    })),
    skills,
  };
}

type ApplyInput = {
  target: CsvImportTarget;
  originalName: string;
  actorMemberId: string;
  totalRows: number;
  unchanged: number;
  departmentChanges?: DepartmentChange[];
  skillChanges?: SkillChange[];
  memberChanges?: MemberChange[];
  memberSkillChanges?: MemberSkillChange[];
  roleChanges?: RoleImportChange[];
};

export async function applyCsvImport(input: ApplyInput) {
  const initialPasswordHash = input.memberChanges?.some(
    (change) => change.kind === "new",
  )
    ? await hashInitialPassword()
    : undefined;
  try {
    return await prisma.$transaction(
      async (tx) => {
        const actionable = [
          ...(input.departmentChanges ?? []),
          ...(input.skillChanges ?? []),
          ...(input.memberChanges ?? []),
          ...(input.memberSkillChanges ?? []),
          ...(input.roleChanges ?? []),
        ].filter((change) => change.kind !== "unchanged");
        const created = actionable.filter(
          (change) => change.kind === "new",
        ).length;
        const updated = actionable.filter(
          (change) => change.kind === "update",
        ).length;
        const job = await tx.csvImportJob.create({
          data: {
            targetType: targetType(input.target),
            status: CsvImportStatus.APPLIED,
            originalName: input.originalName,
            totalRows: input.totalRows,
            validRows: input.totalRows,
            errorRows: 0,
            summary: { created, updated, unchanged: input.unchanged },
            createdById: input.actorMemberId,
          },
        });
        if (input.departmentChanges) {
          await applyDepartments(
            tx,
            input.departmentChanges,
            input.actorMemberId,
            job.id,
          );
        }
        if (input.skillChanges) {
          await applySkills(
            tx,
            input.skillChanges,
            input.actorMemberId,
            job.id,
          );
        }
        if (input.memberChanges)
          await applyMembers(
            tx,
            input.memberChanges,
            input.actorMemberId,
            job.id,
            initialPasswordHash,
          );
        if (input.memberSkillChanges)
          await applyMemberSkills(
            tx,
            input.memberSkillChanges,
            input.actorMemberId,
            job.id,
          );
        if (input.roleChanges)
          await applyRoles(
            tx,
            input.roleChanges,
            input.actorMemberId,
            job.id,
          );
        await recordAuditLog(tx, {
          actorMemberId: input.actorMemberId,
          action: AUDIT_ACTION.CSV_IMPORT,
          targetType: AUDIT_TARGET_TYPE.CSV,
          targetId: null,
          csvImportJobId: job.id,
          metadata: {
            target: input.target,
            created,
            updated,
            unchanged: input.unchanged,
            deleted: input.roleChanges?.filter((change) => change.kind === "delete").length ?? 0,
          },
        });
        return { jobId: job.id, created, updated };
      },
      // 取り込みは件数が多いと時間がかかるので、既定（5秒）より長く待つ
      { timeout: 60_000, maxWait: 10_000 },
    );
  } catch (error) {
    await recordFailedImport(input, error);
    throw error;
  }
}

async function applyRoles(
  tx: Prisma.TransactionClient,
  changes: RoleImportChange[],
  actorMemberId: string,
  jobId: string,
) {
  const roleIds = new Map(
    (await tx.role.findMany({ select: { id: true, name: true } })).map((role) => [role.name, role.id]),
  );
  for (const change of changes.filter((item) => item.entity === "role" && item.kind !== "unchanged")) {
    const data = {
      name: change.roleName,
      description: change.description ?? null,
      isActive: change.isActive ?? true,
    };
    const saved = change.kind === "new"
      ? await tx.role.create({ data })
      : await tx.role.update({ where: { id: change.id }, data });
    roleIds.set(change.roleName, saved.id);
    await recordAuditLog(tx, {
      actorMemberId,
      csvImportJobId: jobId,
      action: change.kind === "new" ? AUDIT_ACTION.ROLE_CREATE : AUDIT_ACTION.ROLE_UPDATE,
      targetType: AUDIT_TARGET_TYPE.ROLE,
      targetId: saved.id,
      before: change.kind === "update" ? beforeFromChanges(change.changes) : null,
      after: change.kind === "new" ? data : afterFromChanges(change.changes),
      changedFields: change.kind === "update" ? Object.keys(change.changes) : undefined,
    });
  }
  for (const change of changes.filter((item) => item.entity === "requirement" && item.kind !== "unchanged")) {
    const roleId = roleIds.get(change.roleName);
    if (!roleId || !change.skillId) throw new Error(`ロール ${change.roleName} の要件登録に失敗しました`);
    if (change.kind === "delete") {
      await tx.roleRequirement.delete({
        where: { roleId_skillId: { roleId, skillId: change.skillId } },
      });
      await recordAuditLog(tx, {
        actorMemberId,
        csvImportJobId: jobId,
        action: AUDIT_ACTION.ROLE_REQUIREMENT_REMOVE,
        targetType: AUDIT_TARGET_TYPE.ROLE,
        targetId: roleId,
        before: {
          requiredLevel: change.requiredLevel,
          isRequired: change.isRequired,
          anyOfGroup: change.anyOfGroup ?? null,
        },
        metadata: { skillId: change.skillId },
      });
      continue;
    }
    const data = {
      roleId,
      skillId: change.skillId,
      requiredLevel: change.requiredLevel!,
      isRequired: change.isRequired!,
      anyOfGroup: change.anyOfGroup ?? null,
    };
    const saved = change.kind === "new"
      ? await tx.roleRequirement.create({ data })
      : await tx.roleRequirement.update({ where: { id: change.id }, data });
    await recordAuditLog(tx, {
      actorMemberId,
      csvImportJobId: jobId,
      action: AUDIT_ACTION.ROLE_REQUIREMENT_SET,
      targetType: AUDIT_TARGET_TYPE.ROLE,
      targetId: roleId,
      before: change.kind === "update" ? beforeFromChanges(change.changes) : null,
      after: change.kind === "new"
        ? { requiredLevel: saved.requiredLevel, isRequired: saved.isRequired, anyOfGroup: saved.anyOfGroup }
        : afterFromChanges(change.changes),
      changedFields: change.kind === "update" ? Object.keys(change.changes) : undefined,
      metadata: { skillId: change.skillId },
    });
  }
}

async function applyMembers(
  tx: Prisma.TransactionClient,
  changes: MemberChange[],
  actorMemberId: string,
  jobId: string,
  initialPasswordHash: string | undefined,
) {
  for (const change of changes.filter((item) => item.kind !== "unchanged")) {
    const data = {
      employeeNo: change.code,
      name: change.name,
      email: change.email,
      departmentId: change.departmentId,
      jobTitle: change.jobTitle,
      status: change.status,
      managerId: change.managerId,
      targetRoleId: change.targetRoleId,
    };
    const saved =
      change.kind === "new"
        ? (await createMemberWithUser(tx, data, initialPasswordHash)).member
        : await tx.member.update({ where: { id: change.id }, data });
    await recordAuditLog(tx, {
      actorMemberId,
      action:
        change.kind === "new"
          ? AUDIT_ACTION.MEMBER_CREATE
          : AUDIT_ACTION.MEMBER_UPDATE,
      targetType: AUDIT_TARGET_TYPE.MEMBER,
      targetId: saved.id,
      csvImportJobId: jobId,
      before:
        change.kind === "update" ? beforeFromChanges(change.changes) : null,
      after:
        change.kind === "new"
          ? {
              employeeNo: change.code,
              name: change.name,
              email: change.email,
              departmentCode: change.departmentCode,
              jobTitle: change.jobTitle,
              status: change.status,
              managerEmployeeNo: change.managerEmployeeNo,
              targetRoleName: change.targetRoleName,
            }
          : afterFromChanges(change.changes),
      changedFields:
        change.kind === "update" ? Object.keys(change.changes) : undefined,
    });
  }
}

async function applyMemberSkills(
  tx: Prisma.TransactionClient,
  changes: MemberSkillChange[],
  actorMemberId: string,
  jobId: string,
) {
  for (const change of changes.filter((item) => item.kind !== "unchanged")) {
    const data = {
      memberId: change.memberId,
      skillId: change.skillId,
      level: change.level,
      yearsOfExperience: change.yearsOfExperience,
      lastAssessedAt: change.lastAssessedAt
        ? new Date(`${change.lastAssessedAt}T00:00:00Z`)
        : null,
    };
    const saved =
      change.kind === "new"
        ? await tx.memberSkill.create({ data })
        : await tx.memberSkill.update({ where: { id: change.id }, data });
    const previousLevel =
      change.kind === "update"
        ? (change.changes.level?.before as number | undefined)
        : undefined;
    if (change.kind === "new" || previousLevel !== undefined)
      await tx.skillLevelChange.create({
        data: {
          memberId: change.memberId,
          skillId: change.skillId,
          fromLevel: previousLevel ?? null,
          toLevel: change.level,
          source: SkillLevelChangeSource.CSV_IMPORT,
          changedByMemberId: actorMemberId,
        },
      });
    await recordAuditLog(tx, {
      actorMemberId,
      action:
        change.kind === "new"
          ? AUDIT_ACTION.MEMBER_SKILL_CREATE
          : AUDIT_ACTION.MEMBER_SKILL_UPDATE,
      targetType: AUDIT_TARGET_TYPE.MEMBER_SKILL,
      targetId: saved.id,
      csvImportJobId: jobId,
      before:
        change.kind === "update" ? beforeFromChanges(change.changes) : null,
      after:
        change.kind === "new"
          ? {
              level: change.level,
              yearsOfExperience: change.yearsOfExperience,
              lastAssessedAt: change.lastAssessedAt,
            }
          : afterFromChanges(change.changes),
      changedFields:
        change.kind === "update" ? Object.keys(change.changes) : undefined,
      metadata: { memberId: change.memberId, skillId: change.skillId },
    });
  }
}

async function applyDepartments(
  tx: Prisma.TransactionClient,
  changes: DepartmentChange[],
  actorMemberId: string,
  jobId: string,
) {
  const ids = new Map(
    (await tx.department.findMany({ select: { id: true, code: true } })).map(
      (item) => [item.code, item.id],
    ),
  );
  for (const change of changes.filter((item) => item.kind === "new")) {
    const created = await tx.department.create({
      data: { code: change.code, name: change.name, isActive: change.isActive },
    });
    ids.set(change.code, created.id);
  }
  for (const change of changes.filter((item) => item.kind !== "unchanged")) {
    const id = ids.get(change.code);
    if (!id) {
      throw new Error(`部署 ${change.code} の登録に失敗しました`);
    }
    const parentDepartmentId = change.parentCode
      ? ids.get(change.parentCode)
      : null;
    const saved = await tx.department.update({
      where: { id },
      data: {
        name: change.name,
        parentDepartmentId,
        isActive: change.isActive,
      },
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action:
        change.kind === "new"
          ? AUDIT_ACTION.DEPARTMENT_CREATE
          : AUDIT_ACTION.DEPARTMENT_UPDATE,
      targetType: AUDIT_TARGET_TYPE.DEPARTMENT,
      targetId: saved.id,
      csvImportJobId: jobId,
      before:
        change.kind === "update" ? beforeFromChanges(change.changes) : null,
      after:
        change.kind === "new"
          ? {
              name: change.name,
              parentCode: change.parentCode,
              isActive: change.isActive,
            }
          : afterFromChanges(change.changes),
      changedFields:
        change.kind === "update" ? Object.keys(change.changes) : undefined,
    });
  }
}

async function applySkills(
  tx: Prisma.TransactionClient,
  changes: SkillChange[],
  actorMemberId: string,
  jobId: string,
) {
  const existingCategories = await tx.skillCategory.findMany({
    select: { id: true, name: true, displayOrder: true },
  });
  const categoryIds = new Map(
    existingCategories.map((category) => [category.name, category.id]),
  );
  let nextCategoryOrder =
    Math.max(-1, ...existingCategories.map((category) => category.displayOrder)) + 1;
  for (const categoryName of [
    ...new Set(
      changes
        .filter((item) => item.kind !== "unchanged")
        .map((item) => item.categoryName),
    ),
  ]) {
    if (categoryIds.has(categoryName)) continue;
    const created = await tx.skillCategory.create({
      data: { name: categoryName, displayOrder: nextCategoryOrder },
    });
    nextCategoryOrder += 1;
    categoryIds.set(categoryName, created.id);
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.SKILL_CATEGORY_CREATE,
      targetType: AUDIT_TARGET_TYPE.SKILL_CATEGORY,
      targetId: created.id,
      csvImportJobId: jobId,
      after: { name: categoryName, displayOrder: created.displayOrder },
    });
  }
  const existingSkills = await tx.skill.findMany({
    select: { categoryId: true, displayOrder: true },
  });
  const nextSkillOrders = new Map<string, number>();
  for (const skill of existingSkills) {
    nextSkillOrders.set(
      skill.categoryId,
      Math.max(nextSkillOrders.get(skill.categoryId) ?? 0, skill.displayOrder + 1),
    );
  }
  for (const change of changes.filter((item) => item.kind !== "unchanged")) {
    const categoryId = categoryIds.get(change.categoryName);
    if (!categoryId) throw new Error(`カテゴリ ${change.categoryName} の登録に失敗しました`);
    const movedCategory = change.kind === "new" || change.categoryId !== categoryId;
    const data = {
      code: change.code,
      name: change.name,
      categoryId,
      description: change.description,
      isActive: change.isActive,
      ...(movedCategory
        ? { displayOrder: nextSkillOrders.get(categoryId) ?? 0 }
        : {}),
    };
    if (movedCategory) {
      nextSkillOrders.set(categoryId, (nextSkillOrders.get(categoryId) ?? 0) + 1);
    }
    const skillChanges = Object.fromEntries(
      Object.entries(change.changes).filter(
        ([field]) => !field.startsWith("levelGuide"),
      ),
    );
    const saved =
      change.kind === "new"
        ? await tx.skill.create({ data })
        : Object.keys(skillChanges).length > 0
          ? await tx.skill.update({ where: { id: change.id }, data })
          : await tx.skill.findUniqueOrThrow({ where: { id: change.id } });
    if (change.kind === "new" || Object.keys(skillChanges).length > 0) {
      await recordAuditLog(tx, {
        actorMemberId,
        action:
          change.kind === "new"
            ? AUDIT_ACTION.SKILL_CREATE
            : AUDIT_ACTION.SKILL_UPDATE,
        targetType: AUDIT_TARGET_TYPE.SKILL,
        targetId: saved.id,
        csvImportJobId: jobId,
        before:
          change.kind === "update" ? beforeFromChanges(skillChanges) : null,
        after: change.kind === "new" ? data : afterFromChanges(skillChanges),
        changedFields:
          change.kind === "update" ? Object.keys(skillChanges) : undefined,
      });
    }
    if (change.levelGuides !== null) {
      const beforeGuides = await tx.skillLevelGuide.findMany({
        where: { skillId: saved.id },
        select: { level: true, description: true },
        orderBy: { level: "asc" },
      });
      for (const guide of change.levelGuides) {
        if (guide.description === "") {
          await tx.skillLevelGuide.deleteMany({
            where: { skillId: saved.id, level: guide.level },
          });
        } else {
          await tx.skillLevelGuide.upsert({
            where: { skillId_level: { skillId: saved.id, level: guide.level } },
            create: { skillId: saved.id, ...guide },
            update: { description: guide.description },
          });
        }
      }
      const before = Object.fromEntries(
        beforeGuides.map((guide) => [guide.level, guide.description]),
      );
      const after = Object.fromEntries(
        change.levelGuides
          .filter((guide) => guide.description !== "")
          .map((guide) => [guide.level, guide.description]),
      );
      const guideDiff = diffForAudit(before, after);
      if (guideDiff) {
        await recordAuditLog(tx, {
          actorMemberId,
          action: AUDIT_ACTION.SKILL_LEVEL_GUIDES_UPDATE,
          targetType: AUDIT_TARGET_TYPE.SKILL,
          targetId: saved.id,
          csvImportJobId: jobId,
          ...guideDiff,
        });
      }
    }
  }
}

async function recordFailedImport(input: ApplyInput, error: unknown) {
  await prisma.$transaction(async (tx) => {
    const job = await tx.csvImportJob.create({
      data: {
        targetType: targetType(input.target),
        status: CsvImportStatus.FAILED,
        originalName: input.originalName,
        totalRows: input.totalRows,
        validRows: 0,
        errorRows: input.totalRows,
        summary: { error: safeError(error) },
        createdById: input.actorMemberId,
      },
    });
    await recordAuditLog(tx, {
      actorMemberId: input.actorMemberId,
      action: AUDIT_ACTION.CSV_IMPORT_FAILED,
      targetType: AUDIT_TARGET_TYPE.CSV,
      targetId: null,
      csvImportJobId: job.id,
      metadata: {
        target: input.target,
        stage: "commit",
        originalName: input.originalName,
        totalRows: input.totalRows,
        errorCount: 1,
        error: safeError(error),
        errors: [{ message: safeError(error) }],
      },
    });
  });
}

function targetType(target: CsvImportTarget) {
  switch (target) {
    case "departments":
      return CsvImportTargetType.DEPARTMENTS;
    case "members":
      return CsvImportTargetType.MEMBERS;
    case "skills":
      return CsvImportTargetType.SKILLS;
    case "member-skills":
      return CsvImportTargetType.MEMBER_SKILLS;
    case "roles":
      return CsvImportTargetType.ROLES;
  }
}

function beforeFromChanges(changes: Record<string, { before: unknown }>) {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [key, value.before]),
  );
}

function afterFromChanges(changes: Record<string, { after: unknown }>) {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [key, value.after]),
  );
}

function safeError(error: unknown) {
  return error instanceof Error ? error.name : "ImportError";
}
