"use server";

import { MemberStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createSkillAssessment,
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
  requireAuthenticatedMember,
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
  const session = await requireAuthenticatedMember();

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
