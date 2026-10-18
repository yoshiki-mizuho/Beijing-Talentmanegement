import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "../domain/audit-action";
import {
  AUDIT_PAGE_SIZE,
  classifyAuditAction,
  targetGroup,
  type AuditLogQuery,
} from "../domain/audit-log-query";

type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: {
    actorMember: {
      select: { id: true; name: true; avatarUpdatedAt: true };
    };
  };
}>;

const auditActions = Object.values(AUDIT_ACTION);
const auditTargetTypes = Object.values(AUDIT_TARGET_TYPE);

function targetTypes(query: AuditLogQuery) {
  return auditTargetTypes.filter((type) => {
    const group = targetGroup(type);
    return group !== null && query.targets.includes(group);
  });
}

function actions(query: AuditLogQuery) {
  return auditActions.filter((action) =>
    query.operations.includes(classifyAuditAction(action)),
  );
}

async function loadNameSearchIds(q: string) {
  const [members, departments, skills, categories, roles] = await Promise.all([
    prisma.member.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { employeeNo: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 100,
    }),
    prisma.department.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: 100,
    }),
    prisma.skill.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true },
      take: 100,
    }),
    prisma.skillCategory.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true },
      take: 100,
    }),
    prisma.role.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true },
      take: 100,
    }),
  ]);
  return {
    memberIds: members.map(({ id }) => id),
    skillIds: skills.map(({ id }) => id),
    targetIds: [
      ...members,
      ...departments,
      ...skills,
      ...categories,
      ...roles,
    ].map(({ id }) => id),
  };
}

export async function buildAuditLogWhere(
  query: AuditLogQuery,
): Promise<Prisma.AuditLogWhereInput> {
  const where: Prisma.AuditLogWhereInput = {
    occurredAt: { gte: query.from, lte: query.to },
  };
  if (query.actor) {
    where.actorMemberId = query.actor;
  }
  if (query.targets.length) {
    where.targetType = { in: targetTypes(query) };
  }
  if (query.operations.length) {
    where.action = { in: actions(query) };
  }
  if (query.q) {
    const { memberIds, skillIds, targetIds } = await loadNameSearchIds(query.q);
    where.OR = [
      { targetId: { in: targetIds } },
      ...memberIds.map((id) => ({
        metadata: { path: ["memberId"], equals: id },
      })),
      ...skillIds.map((id) => ({
        metadata: { path: ["skillId"], equals: id },
      })),
      { before: { path: ["name"], string_contains: query.q } },
    ];
  }
  return where;
}

const auditLogInclude = {
  actorMember: { select: { id: true, name: true, avatarUpdatedAt: true } },
} satisfies Prisma.AuditLogInclude;

export async function loadAuditLogs(query: AuditLogQuery) {
  const where = await buildAuditLogWhere(query);
  const [total, initialLogs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: auditLogInclude,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const logs =
    page === query.page
      ? initialLogs
      : await prisma.auditLog.findMany({
          where,
          include: auditLogInclude,
          orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * AUDIT_PAGE_SIZE,
          take: AUDIT_PAGE_SIZE,
        });
  return { logs, total, page, pageCount };
}

export async function loadAuditActors() {
  const rows = await prisma.auditLog.findMany({
    where: { actorMemberId: { not: null } },
    distinct: ["actorMemberId"],
    select: { actorMember: { select: { id: true, name: true } } },
    orderBy: { actorMemberId: "asc" },
  });
  return rows.flatMap((row) => (row.actorMember ? [row.actorMember] : []));
}

function jsonObject(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function addString(value: unknown, ids: Set<string>) {
  if (typeof value === "string") {
    ids.add(value);
  }
}

export async function loadAuditNameMaps(logs: AuditLogRow[]) {
  const ids = {
    members: new Set<string>(),
    departments: new Set<string>(),
    skills: new Set<string>(),
    categories: new Set<string>(),
    roles: new Set<string>(),
    memberSkills: new Set<string>(),
    assessments: new Set<string>(),
  };
  const referenceFields = {
    departmentId: ids.departments,
    categoryId: ids.categories,
    managerId: ids.members,
    targetRoleId: ids.roles,
    memberId: ids.members,
    skillId: ids.skills,
  };
  for (const log of logs) {
    if (log.targetId) {
      if (log.targetType === AUDIT_TARGET_TYPE.MEMBER) {
        ids.members.add(log.targetId);
      } else if (log.targetType === AUDIT_TARGET_TYPE.DEPARTMENT) {
        ids.departments.add(log.targetId);
      } else if (log.targetType === AUDIT_TARGET_TYPE.SKILL) {
        ids.skills.add(log.targetId);
      } else if (log.targetType === AUDIT_TARGET_TYPE.SKILL_CATEGORY) {
        ids.categories.add(log.targetId);
      } else if (log.targetType === AUDIT_TARGET_TYPE.ROLE) {
        ids.roles.add(log.targetId);
      } else if (log.targetType === AUDIT_TARGET_TYPE.MEMBER_SKILL) {
        ids.memberSkills.add(log.targetId);
      } else if (log.targetType === AUDIT_TARGET_TYPE.SKILL_SELF_ASSESSMENT) {
        ids.assessments.add(log.targetId);
      }
    }
    for (const value of [log.before, log.after, log.metadata]) {
      const object = jsonObject(value);
      if (!object) {
        continue;
      }
      for (const [field, target] of Object.entries(referenceFields)) {
        addString(object[field], target);
      }
    }
  }
  const [
    members,
    departments,
    skills,
    categories,
    roles,
    memberSkills,
    assessments,
  ] = await Promise.all([
    prisma.member.findMany({
      where: { id: { in: [...ids.members] } },
      select: { id: true, name: true },
    }),
    prisma.department.findMany({
      where: { id: { in: [...ids.departments] } },
      select: { id: true, name: true },
    }),
    prisma.skill.findMany({
      where: { id: { in: [...ids.skills] } },
      select: { id: true, name: true },
    }),
    prisma.skillCategory.findMany({
      where: { id: { in: [...ids.categories] } },
      select: { id: true, name: true },
    }),
    prisma.role.findMany({
      where: { id: { in: [...ids.roles] } },
      select: { id: true, name: true },
    }),
    prisma.memberSkill.findMany({
      where: { id: { in: [...ids.memberSkills] } },
      select: {
        id: true,
        memberId: true,
        skillId: true,
        member: { select: { id: true, name: true } },
        skill: { select: { id: true, name: true } },
      },
    }),
    prisma.skillSelfAssessment.findMany({
      where: { id: { in: [...ids.assessments] } },
      select: {
        id: true,
        memberId: true,
        skillId: true,
        member: { select: { id: true, name: true } },
        skill: { select: { id: true, name: true } },
      },
    }),
  ]);
  return {
    members: [
      ...members,
      ...memberSkills.map(({ member }) => member),
      ...assessments.map(({ member }) => member),
    ],
    departments,
    skills: [
      ...skills,
      ...memberSkills.map(({ skill }) => skill),
      ...assessments.map(({ skill }) => skill),
    ],
    categories,
    roles,
    memberSkills,
    assessments,
  };
}
