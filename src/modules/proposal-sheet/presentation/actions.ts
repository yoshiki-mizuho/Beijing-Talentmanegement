"use server";

import { revalidatePath } from "next/cache";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runActionWithData } from "@/shared/lib/action-result";
import { generateProposalSheet, saveProposalSheet } from "../application/proposal-sheet-service";
import type {
  ProposalSheetEditInput,
  ProposalSheetSettingsInput
} from "../domain/proposal-sheet-schema";

function actor(session: Awaited<ReturnType<typeof requirePasswordReadyMember>>) {
  return { memberId: session.user.memberId, role: session.user.role };
}

export async function generateProposalSheetAction(input: ProposalSheetSettingsInput) {
  return runActionWithData(async () => {
    const session = await requirePasswordReadyMember();
    const result = await generateProposalSheet(actor(session), input);
    revalidatePath(`/proposal-sheets/${input.memberId}`);
    return result;
  }, (result) => result.message ?? "下書きを作りました。");
}

export async function saveProposalSheetAction(input: ProposalSheetEditInput) {
  return runActionWithData(async () => {
    const session = await requirePasswordReadyMember();
    await saveProposalSheet(actor(session), input);
    revalidatePath(`/proposal-sheets/${input.memberId}`);
  }, "提案用スキルシートを保存しました。");
}
