import { prisma } from "@/server/db/prisma";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";

export function listTemplates() {
  return prisma.skillSheetTemplate.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      fileName: true,
      sizeBytes: true,
      useCount: true,
      lastUsedAt: true,
      updatedAt: true,
      updatedById: true
    }
  });
}

export function countTemplates() {
  return prisma.skillSheetTemplate.count();
}

export function findTemplate(id: string) {
  return prisma.skillSheetTemplate.findUnique({ where: { id } });
}

export async function createTemplate(input: {
  actorMemberId: string;
  name: string;
  fileName: string;
  content: Uint8Array;
}) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.skillSheetTemplate.create({
      data: {
        name: input.name,
        fileName: input.fileName,
        content: Buffer.from(input.content),
        sizeBytes: input.content.byteLength,
        updatedById: input.actorMemberId
      }
    });
    await recordAuditLog(tx, {
      actorMemberId: input.actorMemberId,
      action: AUDIT_ACTION.SKILL_SHEET_TEMPLATE_CREATE,
      targetType: AUDIT_TARGET_TYPE.SKILL_SHEET_TEMPLATE,
      targetId: template.id,
      after: snapshot(template)
    });
    return template;
  });
}

export async function updateTemplate(input: {
  actorMemberId: string;
  id: string;
  name?: string;
  fileName?: string;
  content?: Uint8Array;
}) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.skillSheetTemplate.findUniqueOrThrow({ where: { id: input.id } });
    const template = await tx.skillSheetTemplate.update({
      where: { id: input.id },
      data: {
        name: input.name,
        fileName: input.fileName,
        content: input.content ? Buffer.from(input.content) : undefined,
        sizeBytes: input.content?.byteLength,
        updatedById: input.actorMemberId
      }
    });
    await recordAuditLog(tx, {
      actorMemberId: input.actorMemberId,
      action: AUDIT_ACTION.SKILL_SHEET_TEMPLATE_UPDATE,
      targetType: AUDIT_TARGET_TYPE.SKILL_SHEET_TEMPLATE,
      targetId: template.id,
      before: snapshot(before),
      after: snapshot(template)
    });
    return template;
  });
}

export async function deleteTemplate(actorMemberId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.skillSheetTemplate.delete({ where: { id } });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.SKILL_SHEET_TEMPLATE_DELETE,
      targetType: AUDIT_TARGET_TYPE.SKILL_SHEET_TEMPLATE,
      targetId: id,
      before: snapshot(before)
    });
  });
}

export async function recordTemplateUse(input: {
  actorMemberId: string;
  draftId: string;
  templateId: string | null;
  templateName: string;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.templateId) {
      await tx.skillSheetTemplate.update({
        where: { id: input.templateId },
        data: { useCount: { increment: 1 }, lastUsedAt: new Date() }
      });
    }
    await recordAuditLog(tx, {
      actorMemberId: input.actorMemberId,
      action: AUDIT_ACTION.PROPOSAL_SHEET_EXPORT,
      targetType: AUDIT_TARGET_TYPE.PROPOSAL_SHEET_DRAFT,
      targetId: input.draftId,
      metadata: { templateId: input.templateId ?? "standard", templateName: input.templateName }
    });
  });
}

function snapshot(value: { name: string; fileName: string; sizeBytes: number }) {
  return { name: value.name, fileName: value.fileName, sizeBytes: value.sizeBytes };
}
