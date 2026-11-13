"use server";

import { revalidatePath } from "next/cache";

import {
  acknowledgeTeamGoalCelebration,
  upsertTeamGoal
} from "@/modules/team-goals/application/team-goal-service";
import { requireRoles } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";

export async function saveTeamGoalAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(["ADMIN", "MANAGER", "MEMBER"]);
    await upsertTeamGoal({
      id: stringOrUndefined(formData.get("id")),
      kind: String(formData.get("kind")),
      skillId: stringOrUndefined(formData.get("skillId")),
      targetLevel: numberOrUndefined(formData.get("targetLevel")),
      targetCount: Number(formData.get("targetCount")),
      note: stringOrUndefined(formData.get("note")),
      months: Number(formData.get("months"))
    }, {
      memberId: session.user.memberId,
      role: session.user.role
    });
    revalidatePath("/dashboard");
  }, "チーム目標を保存しました。");
}

export async function acknowledgeTeamGoalCelebrationAction(teamGoalId: string) {
  try {
    const session = await requireRoles(["ADMIN", "MANAGER", "MEMBER"]);
    if (!session.user.memberId) return;
    await acknowledgeTeamGoalCelebration(teamGoalId, session.user.memberId);
  } catch {
    // 確認記録に失敗した場合は、次にダッシュボードを開いたときにもう一度表示する。
  }
}

function stringOrUndefined(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  return text ? Number(text) : undefined;
}
