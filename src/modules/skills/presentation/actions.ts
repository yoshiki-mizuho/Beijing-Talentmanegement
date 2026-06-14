"use server";

import { revalidatePath } from "next/cache";

import {
  createSkill,
  createSkillCategory,
  deactivateSkill,
  updateSkill
} from "@/modules/skills/application/skill-service";
import { getNumber, getOptionalString, getString } from "@/shared/lib/form-data";

function parseSkillForm(formData: FormData) {
  return {
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    categoryId: getString(formData, "categoryId"),
    description: getOptionalString(formData, "description"),
    isActive: formData.get("isActive") === "on"
  };
}

export async function createSkillCategoryAction(formData: FormData) {
  await createSkillCategory({
    name: getString(formData, "name"),
    displayOrder: getNumber(formData, "displayOrder")
  });
  revalidatePath("/skills");
}

export async function createSkillAction(formData: FormData) {
  await createSkill(parseSkillForm(formData));
  revalidatePath("/skills");
}

export async function updateSkillAction(formData: FormData) {
  await updateSkill(getString(formData, "id"), parseSkillForm(formData));
  revalidatePath("/skills");
  revalidatePath("/members");
  revalidatePath("/roles");
}

export async function deactivateSkillAction(formData: FormData) {
  await deactivateSkill(getString(formData, "id"));
  revalidatePath("/skills");
  revalidatePath("/members");
  revalidatePath("/roles");
}
