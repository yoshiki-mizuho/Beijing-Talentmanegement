"use server";

import { revalidatePath } from "next/cache";

import {
  generateGrowthHint,
  getGrowthHint,
} from "@/modules/ai-evaluation/application/growth-hint-service";
import { requireAuthenticatedMember } from "@/server/auth/authorization";

export async function getGrowthHintAction(memberId: string) {
  const session = await requireAuthenticatedMember();
  return getGrowthHint(memberId, {
    memberId: session.user.memberId,
    role: session.user.role,
  });
}

export async function generateGrowthHintAction(memberId: string) {
  const session = await requireAuthenticatedMember();
  const result = await generateGrowthHint(memberId, {
    memberId: session.user.memberId,
    role: session.user.role,
  });
  revalidatePath("/talent/members");
  return result;
}
