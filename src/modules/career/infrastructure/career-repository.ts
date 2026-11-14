import type { MemberCertification, MemberProjectHistory } from "@prisma/client";

import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { prisma } from "@/server/db/prisma";
import type { ParsedCertification, ParsedProjectHistory, ParsedSkillSheetBasics } from "../domain/career-schema";

export function getMemberCareer(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      itCareerStartMonth: true,
      skillSheetNote: true,
      projectHistories: { orderBy: [{ startMonth: "desc" }, { createdAt: "desc" }] },
      certifications: {
        orderBy: [
          { acquiredMonth: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" }
        ]
      }
    }
  });
}

export function countProjectHistories(memberId: string) {
  return prisma.memberProjectHistory.count({ where: { memberId } });
}

export function countCertifications(memberId: string) {
  return prisma.memberCertification.count({ where: { memberId } });
}

export function findProjectHistory(id: string, memberId: string) {
  return prisma.memberProjectHistory.findFirst({ where: { id, memberId } });
}

export function findCertifications(memberId: string) {
  return prisma.memberCertification.findMany({ where: { memberId }, select: { name: true } });
}

export async function saveProjectHistory(memberId: string, actorMemberId: string, input: ParsedProjectHistory) {
  return prisma.$transaction(async (tx) => {
    const before = input.id
      ? await tx.memberProjectHistory.findFirstOrThrow({ where: { id: input.id, memberId } })
      : null;
    const data = {
      memberId,
      title: input.title,
      startMonth: input.startMonth,
      endMonth: input.endMonth ?? null,
      industry: input.industry,
      summary: input.summary,
      role: input.role,
      teamSize: input.teamSize,
      businessArea: input.businessArea ?? null,
      phases: input.phases,
      technologies: input.technologies
    };
    const history = input.id
      ? await tx.memberProjectHistory.update({ where: { id: input.id }, data })
      : await tx.memberProjectHistory.create({ data });
    await recordAuditLog(tx, {
      actorMemberId,
      action: input.id ? AUDIT_ACTION.MEMBER_CAREER_UPDATE : AUDIT_ACTION.MEMBER_CAREER_CREATE,
      targetType: AUDIT_TARGET_TYPE.MEMBER_PROJECT_HISTORY,
      targetId: history.id,
      before: before ? historySnapshot(before) : null,
      after: historySnapshot(history),
      metadata: { memberId }
    });
    return history;
  });
}

export async function deleteProjectHistory(history: MemberProjectHistory, actorMemberId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.memberProjectHistory.delete({ where: { id: history.id } });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_CAREER_DELETE,
      targetType: AUDIT_TARGET_TYPE.MEMBER_PROJECT_HISTORY,
      targetId: history.id,
      before: historySnapshot(history),
      after: null,
      metadata: { memberId: history.memberId }
    });
  });
}

export async function createCertification(memberId: string, actorMemberId: string, input: ParsedCertification) {
  return prisma.$transaction(async (tx) => {
    const certification = await tx.memberCertification.create({
      data: { memberId, name: input.name, acquiredMonth: input.acquiredMonth ?? null }
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_CERTIFICATION_CREATE,
      targetType: AUDIT_TARGET_TYPE.MEMBER_CERTIFICATION,
      targetId: certification.id,
      before: null,
      after: certificationSnapshot(certification),
      metadata: { memberId }
    });
    return certification;
  });
}

export async function deleteCertification(certification: MemberCertification, actorMemberId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.memberCertification.delete({ where: { id: certification.id } });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_CERTIFICATION_DELETE,
      targetType: AUDIT_TARGET_TYPE.MEMBER_CERTIFICATION,
      targetId: certification.id,
      before: certificationSnapshot(certification),
      after: null,
      metadata: { memberId: certification.memberId }
    });
  });
}

export function findCertification(id: string, memberId: string) {
  return prisma.memberCertification.findFirst({ where: { id, memberId } });
}

export async function updateSkillSheetBasics(memberId: string, actorMemberId: string, input: ParsedSkillSheetBasics) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.member.findUniqueOrThrow({ where: { id: memberId } });
    const member = await tx.member.update({
      where: { id: memberId },
      data: {
        itCareerStartMonth: input.itCareerStartMonth ?? null,
        skillSheetNote: input.skillSheetNote ?? null
      }
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_SKILL_SHEET_BASICS_UPDATE,
      targetType: AUDIT_TARGET_TYPE.MEMBER,
      targetId: memberId,
      before: basicsSnapshot(before),
      after: basicsSnapshot(member)
    });
  });
}

function historySnapshot(value: MemberProjectHistory) {
  return {
    title: value.title,
    startMonth: value.startMonth,
    endMonth: value.endMonth,
    industry: value.industry,
    summary: value.summary,
    role: value.role,
    teamSize: value.teamSize,
    businessArea: value.businessArea,
    phases: value.phases,
    technologies: value.technologies
  };
}

function certificationSnapshot(value: MemberCertification) {
  return { name: value.name, acquiredMonth: value.acquiredMonth };
}

function basicsSnapshot(value: { itCareerStartMonth: string | null; skillSheetNote: string | null }) {
  return { itCareerStartMonth: value.itCareerStartMonth, skillSheetNote: value.skillSheetNote };
}
