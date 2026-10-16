import { CsvImportStatus, CsvImportTargetType, Prisma } from "@prisma/client";
import {
  AUDIT_ACTION,
  AUDIT_TARGET_TYPE,
} from "@/modules/audit/domain/audit-action";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { prisma } from "@/server/db/prisma";
import type {
  DepartmentChange,
  DepartmentState,
} from "../domain/department-import";
import type { CsvImportTarget } from "../domain/csv-import-columns";
import type {
  SkillCategoryState,
  SkillChange,
  SkillState,
} from "../domain/skill-import";

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

type ApplyInput = {
  target: CsvImportTarget;
  originalName: string;
  actorMemberId: string;
  totalRows: number;
  unchanged: number;
  departmentChanges?: DepartmentChange[];
  skillChanges?: SkillChange[];
};

export async function applyCsvImport(input: ApplyInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const actionable = [
        ...(input.departmentChanges ?? []),
        ...(input.skillChanges ?? []),
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
        await applySkills(tx, input.skillChanges, input.actorMemberId, job.id);
      }
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
        },
      });
      return { jobId: job.id, created, updated };
    });
  } catch (error) {
    await recordFailedImport(input, error);
    throw error;
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
  for (const change of changes.filter((item) => item.kind !== "unchanged")) {
    const data = {
      code: change.code,
      name: change.name,
      categoryId: change.categoryId,
      description: change.description,
      isActive: change.isActive,
    };
    const saved =
      change.kind === "new"
        ? await tx.skill.create({ data })
        : await tx.skill.update({ where: { id: change.id }, data });
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
        change.kind === "update" ? beforeFromChanges(change.changes) : null,
      after: change.kind === "new" ? data : afterFromChanges(change.changes),
      changedFields:
        change.kind === "update" ? Object.keys(change.changes) : undefined,
    });
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
      metadata: { target: input.target, error: safeError(error) },
    });
  });
}

function targetType(target: CsvImportTarget) {
  return target === "departments"
    ? CsvImportTargetType.DEPARTMENTS
    : CsvImportTargetType.SKILLS;
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
