"use server";

import { revalidatePath } from "next/cache";

import {
  getManagedMemberMonthlyRecap,
  markMonthlyRecapSeen
} from "@/modules/growth/application/monthly-recap-service";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getString } from "@/shared/lib/form-data";

export async function markMonthlyRecapSeenAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await markMonthlyRecapSeen(session.user.memberId, getString(formData, "month"));
    revalidatePath("/", "layout");
  }, "振り返りを確認しました。");
}

export async function getManagedMemberMonthlyRecapAction(memberId: string, month?: string) {
  const session = await requirePasswordReadyMember();
  const result = await getManagedMemberMonthlyRecap(memberId, month, {
    memberId: session.user.memberId,
    role: session.user.role
  });
  if (!result) return null;
  return JSON.parse(JSON.stringify(result)) as typeof result;
}
