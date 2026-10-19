"use server";

import { revalidatePath } from "next/cache";

import {
  generateGrowthHint,
  getGrowthHint,
} from "@/modules/ai-evaluation/application/growth-hint-service";
import { requirePasswordReadyMember } from "@/server/auth/authorization";

export async function getGrowthHintAction(memberId: string) {
  const session = await requirePasswordReadyMember();
  return getGrowthHint(memberId, {
    memberId: session.user.memberId,
    role: session.user.role,
  });
}

export async function generateGrowthHintAction(memberId: string) {
  const session = await requirePasswordReadyMember();
  const result = await generateGrowthHint(memberId, {
    memberId: session.user.memberId,
    role: session.user.role,
  });
  revalidatePath("/members");
  return result;
}
