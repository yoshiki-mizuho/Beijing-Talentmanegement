"use server";

import { revalidatePath } from "next/cache";

import {
  approveSkillAssessments,
  createSkillAssessment,
  createSkillAssessments,
  removeMemberSkill,
  reviewSkillAssessment,
  setMemberSkillLevel,
  updateMemberTargetRole
} from "@/modules/members/application/member-service";
import { canUpdateMemberTargetRole } from "@/modules/members/domain/member-target-role-policy";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";
import {
  AuthorizationError,
  managerOrAdmin,
  requireAuthenticatedMember,
  requireRoles
} from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getNumber, getOptionalString, getString } from "@/shared/lib/form-data";

export async function setMemberSkillLevelAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(managerOrAdmin);
    const memberId = getString(formData, "memberId");
    const scope = await getMemberScope(session.user.role, session.user.memberId);
    if (!memberIsInScope(scope, memberId)) throw new AuthorizationError("このメンバーを操作する権限がありません。", 403);
    await setMemberSkillLevel({
      memberId,
      skillId: getString(formData, "skillId"),
      level: getNumber(formData, "level"),
      changedByMemberId: session.user.memberId
    }, session.user.memberId);
    revalidatePath("/talent/members");
    revalidatePath("/talent/roles");
  }, "メンバーのスキルを設定しました。");
}

export async function removeMemberSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(managerOrAdmin);
    const memberId = getString(formData, "memberId");
    const scope = await getMemberScope(session.user.role, session.user.memberId);
    if (!memberIsInScope(scope, memberId)) throw new AuthorizationError("このメンバーを操作する権限がありません。", 403);
    await removeMemberSkill(memberId, getString(formData, "skillId"), session.user.memberId);
    revalidatePath("/talent/members");
    revalidatePath("/talent/roles");
  }, "メンバーのスキルを削除しました。");
}

export async function createSkillAssessmentAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAuthenticatedMember();
    await createSkillAssessment({
      memberId: session.user.memberId,
      skillId: getString(formData, "skillId"),
      requestedLevel: getNumber(formData, "requestedLevel"),
      yearsOfExperience: getOptionalString(formData, "yearsOfExperience")
        ? getNumber(formData, "yearsOfExperience")
        : undefined
    }, session.user.memberId);
    revalidatePath("/talent/my/skills");
    revalidatePath("/talent/skill-approvals");
    revalidatePath("/talent/notifications");
  }, "スキルを申請しました。マネージャーの承認をお待ちください。");
}

export async function createSkillAssessmentsAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAuthenticatedMember();
    const assessments = JSON.parse(getString(formData, "assessments")) as unknown;
    const created = await createSkillAssessments({
      memberId: session.user.memberId,
      assessments
    }, session.user.memberId);

    revalidatePath("/talent/my/skills");
    revalidatePath("/talent/skill-approvals");
    revalidatePath("/talent/notifications");
    return created.length;
  }, (count) => `${count}件のスキルを申請しました。マネージャーの承認をお待ちください。`);
}
export async function reviewSkillAssessmentAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(managerOrAdmin);
    const status = getString(formData, "status");

    await reviewSkillAssessment({
      assessmentId: getString(formData, "assessmentId"),
      reviewerMemberId: session.user.memberId,
      reviewerRole: session.user.role,
      status,
      correctedLevel: getOptionalString(formData, "correctedLevel")
        ? getNumber(formData, "correctedLevel")
        : undefined,
      managerComment: getOptionalString(formData, "managerComment")
    });
    revalidatePath("/talent/my/skills");
    revalidatePath("/talent/skill-approvals");
    revalidatePath("/talent/notifications");
    revalidatePath("/talent/members");
    revalidatePath("/talent/roles");
    return status;
  }, (status) => {
    if (status === "REJECTED") return "スキル申請を差し戻しました。";
    if (status === "CORRECTED") return "スキル申請を補正して承認しました。";
    return "スキル申請を承認しました。";
  });
}

export async function approveSkillAssessmentsAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(managerOrAdmin);
    const assessmentIds = JSON.parse(
      getString(formData, "assessmentIds")
    ) as unknown;
    const approved = await approveSkillAssessments({
      assessmentIds,
      reviewerMemberId: session.user.memberId,
      reviewerRole: session.user.role
    });

    revalidatePath("/talent/my/skills");
    revalidatePath("/talent/skill-approvals");
    revalidatePath("/talent/notifications");
    revalidatePath("/talent/members");
    revalidatePath("/talent/roles");
    return approved.length;
  }, (count) => `${count}件の申請を承認しました。`);
}

export async function updateMemberTargetRoleAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAuthenticatedMember();
    const memberId = getString(formData, "memberId");
    if (
      !canUpdateMemberTargetRole(
        session.user.role,
        session.user.memberId,
        memberId
      )
    ) {
      throw new AuthorizationError("このメンバーを操作する権限がありません。", 403);
    }
    await updateMemberTargetRole({
      memberId,
      targetRoleId: getOptionalString(formData, "targetRoleId") ?? null
    }, session.user.memberId);
    revalidatePath("/talent/members");
    revalidatePath("/talent/dashboard");
    revalidatePath("/talent/roles");
    revalidatePath("/talent", "layout");
  }, "目標ロールを更新しました。");
}
