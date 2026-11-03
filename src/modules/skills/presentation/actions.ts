"use server";

import { revalidatePath } from "next/cache";

import {
  createSkillWithLevelGuides,
  createSkillCategory,
  deleteSkillCategory,
  deleteSkill,
  deactivateSkill,
  reorderSkills,
  updateCommonSkillLevelGuides,
  updateSkillCategory,
  updateSkillWithLevelGuides
} from "@/modules/skills/application/skill-service";
import { adminOnly, requireRoles } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getOptionalString, getString } from "@/shared/lib/form-data";

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
    const session = await requireRoles(adminOnly);
    await createSkillCategory({
      name: getString(formData, "name")
    }, session.user.memberId);
    revalidatePath("/skills");
  }, "カテゴリを登録しました。");
}

export async function updateSkillCategoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await updateSkillCategory(getString(formData, "id"), {
      name: getString(formData, "name")
    }, session.user.memberId);
    revalidatePath("/skills");
  }, "カテゴリを更新しました。");
}

export async function deleteSkillCategoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await deleteSkillCategory(getString(formData, "id"), session.user.memberId);
    revalidatePath("/skills");
  }, "カテゴリを削除しました。");
}

export async function createSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await createSkillWithLevelGuides(
      parseSkillForm(formData),
      {
        guides: [1, 2, 3, 4, 5].map((level) => ({
          level,
          description: getString(formData, `levelGuide${level}`)
        }))
      },
      session.user.memberId
    );
    revalidatePath("/skills");
  }, "スキルを登録しました。");
}

export async function updateSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await updateSkillWithLevelGuides(
      getString(formData, "id"),
      {
        ...parseSkillForm(formData),
        code: getString(formData, "code")
      },
      {
        guides: [1, 2, 3, 4, 5].map((level) => ({
          level,
          description: getString(formData, `levelGuide${level}`)
        }))
      },
      session.user.memberId
    );
    revalidatePath("/skills");
    revalidatePath("/members");
    revalidatePath("/roles");
    revalidatePath("/my/skills");
  }, "スキルを更新しました。");
}

export async function deactivateSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await deactivateSkill(getString(formData, "id"), session.user.memberId);
    revalidatePath("/skills");
    revalidatePath("/members");
    revalidatePath("/roles");
  }, "スキルを無効化しました。");
}

export async function deleteSkillAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await deleteSkill(getString(formData, "id"), session.user.memberId);
    revalidatePath("/skills");
    revalidatePath("/members");
    revalidatePath("/roles");
  }, "スキルを削除しました。");
}

export async function reorderSkillsAction(input: {
  categories: { categoryId: string; skillIds: string[] }[];
}): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await reorderSkills(input, session.user.memberId);
    revalidatePath("/skills");
    revalidatePath("/my/skills");
    revalidatePath("/skill-map");
  }, "並び順を保存しました");
}

export async function updateCommonSkillLevelGuidesAction(
  formData: FormData
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await updateCommonSkillLevelGuides(
      {
        guides: [1, 2, 3, 4, 5].map((level) => ({
          level,
          description: getString(formData, `levelGuide${level}`)
        }))
      },
      session.user.memberId
    );
    revalidatePath("/skills");
    revalidatePath("/my/skills");
  }, "レベルの目安を更新しました");
}
