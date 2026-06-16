"use server";

import { revalidatePath } from "next/cache";

import {
  createSkill,
  createSkillCategory,
  deleteSkillCategory,
  deactivateSkill,
  updateSkillCategory,
  updateSkill
} from "@/modules/skills/application/skill-service";
import { adminOnly, requireRoles } from "@/server/auth/authorization";
import { getNumber, getOptionalString, getString } from "@/shared/lib/form-data";

function parseSkillForm(formData: FormData) {
  return {
    name: getString(formData, "name"),
    categoryId: getString(formData, "categoryId"),
    description: getOptionalString(formData, "description"),
    isActive: formData.get("isActive") === "on"
  };
}

export async function createSkillCategoryAction(formData: FormData) {
  await requireRoles(adminOnly);
  await createSkillCategory({
    name: getString(formData, "name"),
    displayOrder: getNumber(formData, "displayOrder")
  });
  revalidatePath("/skills");
}

export async function updateSkillCategoryAction(formData: FormData) {
  await requireRoles(adminOnly);
  await updateSkillCategory(getString(formData, "id"), {
    name: getString(formData, "name"),
    displayOrder: getNumber(formData, "displayOrder")
  });
  revalidatePath("/skills");
}

export async function deleteSkillCategoryAction(formData: FormData) {
  await requireRoles(adminOnly);
  await deleteSkillCategory(getString(formData, "id"));
  revalidatePath("/skills");
}

export async function createSkillAction(formData: FormData) {
  await requireRoles(adminOnly);
  await createSkill(parseSkillForm(formData));
  revalidatePath("/skills");
}

export async function updateSkillAction(formData: FormData) {
  await requireRoles(adminOnly);
  await updateSkill(getString(formData, "id"), {
    ...parseSkillForm(formData),
    code: getString(formData, "code")
  });
  revalidatePath("/skills");
  revalidatePath("/members");
  revalidatePath("/roles");
}

export async function deactivateSkillAction(formData: FormData) {
  await requireRoles(adminOnly);
  await deactivateSkill(getString(formData, "id"));
  revalidatePath("/skills");
  revalidatePath("/members");
  revalidatePath("/roles");
}
