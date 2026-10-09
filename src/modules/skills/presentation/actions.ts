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
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getNumber, getOptionalString, getString } from "@/shared/lib/form-data";

function parseSkillForm(formData: FormData) {
  return {
    name: getString(formData, "name"),
    categoryId: getString(formData, "categoryId"),
    description: getOptionalString(formData, "description"),
    isActive: formData.get("isActive") === "on"
  };
}

export async function createSkillCategoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await createSkillCategory({
      name: getString(formData, "name"),
      displayOrder: getNumber(formData, "displayOrder")
    });
    revalidatePath("/skills");
  }, "カテゴリを登録しました。");
}

export async function updateSkillCategoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await updateSkillCategory(getString(formData, "id"), {
      name: getString(formData, "name"),
      displayOrder: getNumber(formData, "displayOrder")
    });
    revalidatePath("/skills");
  }, "カテゴリを更新しました。");
}

export async function deleteSkillCategoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await deleteSkillCategory(getString(formData, "id"));
    revalidatePath("/skills");
  }, "カテゴリを削除しました。");
}

export async function createSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await createSkill(parseSkillForm(formData));
    revalidatePath("/skills");
  }, "スキルを登録しました。");
}

export async function updateSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await updateSkill(getString(formData, "id"), {
      ...parseSkillForm(formData),
      code: getString(formData, "code")
    });
    revalidatePath("/skills");
    revalidatePath("/members");
    revalidatePath("/roles");
  }, "スキルを更新しました。");
}

export async function deactivateSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await deactivateSkill(getString(formData, "id"));
    revalidatePath("/skills");
    revalidatePath("/members");
    revalidatePath("/roles");
  }, "スキルを無効化しました。");
}
