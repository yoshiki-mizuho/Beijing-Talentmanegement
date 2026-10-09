"use server";

import { MemberStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createSkillAssessment,
  createSkillAssessments,
  createMember,
  deactivateMember,
  removeMemberSkill,
  reviewSkillAssessment,
  setMemberSkillLevel,
  updateMember,
  updateMemberManager,
  updateMemberTargetRole
} from "@/modules/members/application/member-service";
import {
  adminOnly,
  managerOrAdmin,
  requirePasswordReadyMember,
  requireRoles
} from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getNumber, getOptionalString, getString } from "@/shared/lib/form-data";

function parseMemberForm(formData: FormData) {
  return {
    employeeNo: getString(formData, "employeeNo"),
    name: getString(formData, "name"),
    email: getString(formData, "email"),
    departmentId: getString(formData, "departmentId"),
    jobTitle: getOptionalString(formData, "jobTitle"),
    profile: getOptionalString(formData, "profile"),
    status: getString(formData, "status") as MemberStatus
  };
}

export async function createMemberAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(managerOrAdmin);
    await createMember(parseMemberForm(formData));
    revalidatePath("/members");
  }, "メンバーを登録しました。初期認証情報を安全な経路で共有してください。");
}

export async function updateMemberAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(managerOrAdmin);
    await updateMember(getString(formData, "id"), parseMemberForm(formData));
    revalidatePath("/members");
  }, "メンバー情報を更新しました。");
}

export async function deactivateMemberAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await deactivateMember(getString(formData, "id"));
    revalidatePath("/members");
  }, "メンバーを無効化しました。");
}

export async function setMemberSkillLevelAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(managerOrAdmin);
    await setMemberSkillLevel({
      memberId: getString(formData, "memberId"),
      skillId: getString(formData, "skillId"),
      level: getNumber(formData, "level"),
      changedByMemberId: session.user.memberId
    });
    revalidatePath("/members");
    revalidatePath("/roles");
  }, "メンバーのスキルを設定しました。");
}

export async function removeMemberSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(managerOrAdmin);
    await removeMemberSkill(getString(formData, "memberId"), getString(formData, "skillId"));
    revalidatePath("/members");
    revalidatePath("/roles");
  }, "メンバーのスキルを削除しました。");
}

export async function createSkillAssessmentAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await createSkillAssessment({
      memberId: session.user.memberId,
      skillId: getString(formData, "skillId"),
      requestedLevel: getNumber(formData, "requestedLevel"),
      yearsOfExperience: getOptionalString(formData, "yearsOfExperience")
        ? getNumber(formData, "yearsOfExperience")
        : undefined
    });
    revalidatePath("/my/skills");
    revalidatePath("/skill-approvals");
    revalidatePath("/notifications");
  }, "スキルを申請しました。マネージャーの承認をお待ちください。");
}

export async function createSkillAssessmentsAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const assessments = JSON.parse(getString(formData, "assessments")) as unknown;
    const created = await createSkillAssessments({
      memberId: session.user.memberId,
      assessments
    });

    revalidatePath("/my/skills");
    revalidatePath("/skill-approvals");
    revalidatePath("/notifications");
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
    revalidatePath("/my/skills");
    revalidatePath("/skill-approvals");
    revalidatePath("/notifications");
    revalidatePath("/members");
    revalidatePath("/roles");
    return status;
  }, (status) => {
    if (status === "REJECTED") return "スキル申請を差し戻しました。";
    if (status === "CORRECTED") return "スキル申請を補正して承認しました。";
    return "スキル申請を承認しました。";
  });
}

export async function updateMemberManagerAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await updateMemberManager({
      memberId: getString(formData, "memberId"),
      managerId: getOptionalString(formData, "managerId") ?? null
    });
    revalidatePath("/members");
    revalidatePath("/skill-approvals");
  }, "上司を更新しました。");
}

export async function updateMemberTargetRoleAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await updateMemberTargetRole({
      memberId: getString(formData, "memberId"),
      targetRoleId: getOptionalString(formData, "targetRoleId") ?? null
    });
    revalidatePath("/members");
    revalidatePath("/dashboard");
  }, "目標ロールを更新しました。");
}
