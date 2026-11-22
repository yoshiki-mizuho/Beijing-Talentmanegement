"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedMember } from "@/server/auth/authorization";
import { runActionWithData } from "@/shared/lib/action-result";
import { createFallbackProposalSheetForEditor, generateProposalSheet, saveProposalSheet } from "../application/proposal-sheet-service";
import type {
  ProposalSheetEditInput,
  ProposalSheetSettingsInput
} from "../domain/proposal-sheet-schema";

function actor(session: Awaited<ReturnType<typeof requireAuthenticatedMember>>) {
  return { memberId: session.user.memberId, role: session.user.role };
}

export async function generateProposalSheetAction(input: ProposalSheetSettingsInput) {
  return runActionWithData(async () => {
    const session = await requireAuthenticatedMember();
    const result = await generateProposalSheet(actor(session), input);
    revalidatePath(`/talent/proposal-sheets/${input.memberId}`);
    return result;
  }, (result) => result.message ?? "下書きを作りました。");
}

export async function saveProposalSheetAction(input: ProposalSheetEditInput) {
  return runActionWithData(async () => {
    const session = await requireAuthenticatedMember();
    await saveProposalSheet(actor(session), input);
    revalidatePath(`/talent/proposal-sheets/${input.memberId}`);
  }, "提案用スキルシートを保存しました。");
}

export async function createFallbackProposalSheetAction(memberId: string) {
  return runActionWithData(async () => {
    const session = await requireAuthenticatedMember();
    return createFallbackProposalSheetForEditor(actor(session), memberId);
  }, "簡易版を作りました。");
}
