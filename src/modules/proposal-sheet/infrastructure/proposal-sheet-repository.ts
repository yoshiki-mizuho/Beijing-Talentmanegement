import type { Prisma, ProposalSheetDraftSource } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import type { ProposalSheetDraftData } from "../domain/proposal-sheet-schema";

export function getProposalSheetContext(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      memberSkills: {
        orderBy: [{ level: "desc" }, { skill: { displayOrder: "asc" } }],
        select: {
          skillId: true,
          level: true,
          skill: { select: { name: true, category: { select: { name: true } } } }
        }
      },
      proposalSheetDraft: true
    }
  });
}

export async function saveProposalSheetDraft(
  actorMemberId: string,
  input: ProposalSheetDraftData,
  action: "generate" | "update"
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.proposalSheetDraft.findUnique({ where: { memberId: input.memberId } });
    const data = {
      displayName: input.displayName,
      customerRequest: input.customerRequest,
      projectHistoryIds: input.projectHistoryIds,
      excludedSkillIds: input.excludedSkillIds,
      selfPr: input.selfPr,
      strengths: input.strengths,
      projectDescriptions: input.projectDescriptions,
      source: input.source as ProposalSheetDraftSource,
      inputHash: input.inputHash,
      model: input.model,
      generatedAt: input.generatedAt ? new Date(input.generatedAt) : null,
      updatedById: actorMemberId
    };
    const draft = await tx.proposalSheetDraft.upsert({
      where: { memberId: input.memberId },
      create: { memberId: input.memberId, ...data },
      update: data
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: action === "generate" ? AUDIT_ACTION.PROPOSAL_SHEET_GENERATE : AUDIT_ACTION.PROPOSAL_SHEET_UPDATE,
      targetType: AUDIT_TARGET_TYPE.PROPOSAL_SHEET_DRAFT,
      targetId: draft.id,
      before: action === "update" && before ? snapshot(before) : null,
      after: action === "update" ? snapshot(draft) : null,
      metadata: action === "generate"
        ? { memberId: input.memberId, source: input.source }
        : { memberId: input.memberId }
    });
    return draft;
  });
}

function snapshot(value: {
  displayName: string;
  customerRequest: string;
  projectHistoryIds: string[];
  excludedSkillIds: string[];
  selfPr: string;
  strengths: string;
  projectDescriptions: Prisma.JsonValue;
}) {
  return {
    displayName: value.displayName,
    customerRequest: value.customerRequest,
    projectHistoryIds: value.projectHistoryIds,
    excludedSkillIds: value.excludedSkillIds,
    selfPr: value.selfPr,
    strengths: value.strengths,
    projectDescriptions: value.projectDescriptions
  };
}
