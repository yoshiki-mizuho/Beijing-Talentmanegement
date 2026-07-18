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
  updateMember
} from "@/modules/members/application/member-service";
import {
  adminOnly,
  managerOrAdmin,
  requirePasswordReadyMember,
  requireRoles
} from "@/server/auth/authorization";
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

export async function createMemberAction(formData: FormData) {
  await requireRoles(managerOrAdmin);
  await createMember(parseMemberForm(formData));
  revalidatePath("/members");
}

export async function updateMemberAction(formData: FormData) {
  await requireRoles(managerOrAdmin);
  await updateMember(getString(formData, "id"), parseMemberForm(formData));
  revalidatePath("/members");
}

export async function deactivateMemberAction(formData: FormData) {
  await requireRoles(adminOnly);
  await deactivateMember(getString(formData, "id"));
  revalidatePath("/members");
}

export async function setMemberSkillLevelAction(formData: FormData) {
  await requireRoles(managerOrAdmin);
  await setMemberSkillLevel({
    memberId: getString(formData, "memberId"),
    skillId: getString(formData, "skillId"),
    level: getNumber(formData, "level")
  });
  revalidatePath("/members");
  revalidatePath("/roles");
}

export async function removeMemberSkillAction(formData: FormData) {
  await requireRoles(managerOrAdmin);
  await removeMemberSkill(getString(formData, "memberId"), getString(formData, "skillId"));
  revalidatePath("/members");
  revalidatePath("/roles");
}

export async function createSkillAssessmentAction(formData: FormData) {
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
}

type SkillAssessmentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createSkillAssessmentsAction(
  _previousState: SkillAssessmentActionState,
  formData: FormData
): Promise<SkillAssessmentActionState> {
  const session = await requirePasswordReadyMember();

  try {
    const assessments = JSON.parse(getString(formData, "assessments")) as unknown;
    const created = await createSkillAssessments({
      memberId: session.user.memberId,
      assessments
    });

    revalidatePath("/my/skills");
    revalidatePath("/skill-approvals");
    revalidatePath("/notifications");

    return {
      status: "success" as const,
      message: `${created.length}件のスキルを申請しました。`
    };
  } catch (error) {
    const knownMessages = [
      "申請するスキルを1件以上追加してください。",
      "一度に申請できるスキルは50件までです。",
      "同じスキルを重複して申請することはできません。",
      "申請対象に存在しない、または無効なスキルが含まれています。",
      "すでに承認待ちのスキルが含まれています。"
    ];
    const message = error instanceof Error
      ? knownMessages.find((knownMessage) => error.message.includes(knownMessage))
      : undefined;

    return {
      status: "error" as const,
      message: message ?? "申請内容を確認して、もう一度お試しください。"
    };
  }
}
export async function reviewSkillAssessmentAction(formData: FormData) {
  const session = await requireRoles(managerOrAdmin);

  await reviewSkillAssessment({
    assessmentId: getString(formData, "assessmentId"),
    reviewerMemberId: session.user.memberId,
    status: getString(formData, "status"),
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
}
