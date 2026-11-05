"use server";

import { revalidatePath } from "next/cache";

import {
  createSkillWithLevelGuides,
  assignSkillCategoryGroup,
  createSkillCategoryGroup,
  deleteSkillCategoryGroup,
  reorderSkillCategoryGroups,
  updateSkillCategoryGroup,
  createSkillCategory,
  deleteSkillCategory,
  deleteSkill,
  deactivateSkill,
  reorderSkills,
  updateCommonSkillLevelGuides,
  updateSkillCategory,
  updateSkillWithLevelGuides,
  createSkillPrerequisite,
  createSkillPrerequisites,
  deleteSkillPrerequisite
} from "@/modules/skills/application/skill-service";
import { generateSkillPrerequisiteSuggestions } from "@/modules/ai-evaluation/application/skill-prerequisite-suggestion-service";
import { adminOnly, requireRoles } from "@/server/auth/authorization";
import { runAction, runActionWithData, type ActionResult } from "@/shared/lib/action-result";
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

function revalidateSkillCategoryGroups() {
  revalidatePath("/skills");
  revalidatePath("/my/skills");
}

export async function createSkillCategoryGroupAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await createSkillCategoryGroup({ name: getString(formData, "name") }, session.user.memberId);
    revalidateSkillCategoryGroups();
  }, "大分類を追加しました。");
}

export async function updateSkillCategoryGroupAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await updateSkillCategoryGroup(
      getString(formData, "id"), { name: getString(formData, "name") }, session.user.memberId
    );
    revalidateSkillCategoryGroups();
  }, "大分類名を更新しました。");
}

export async function deleteSkillCategoryGroupAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await deleteSkillCategoryGroup(getString(formData, "id"), session.user.memberId);
    revalidateSkillCategoryGroups();
  }, "大分類を削除しました。カテゴリは未分類に戻りました。");
}

export async function reorderSkillCategoryGroupsAction(input: {
  groupIds: string[];
}): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await reorderSkillCategoryGroups(input, session.user.memberId);
    revalidateSkillCategoryGroups();
  }, "大分類の並び順を保存しました。");
}

export async function assignSkillCategoryGroupAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    const groupId = getString(formData, "groupId");
    await assignSkillCategoryGroup({
      categoryId: getString(formData, "categoryId"),
      groupId: groupId === "unclassified" ? null : groupId
    }, session.user.memberId);
    revalidateSkillCategoryGroups();
  }, "カテゴリの大分類を保存しました。");
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

export async function generateSkillPrerequisiteSuggestionsAction(
  scope: "unrelated" | "all"
) {
  return runActionWithData(async () => {
    const session = await requireRoles(adminOnly);
    return generateSkillPrerequisiteSuggestions(scope, session.user.memberId);
  }, "候補を作りました。");
}

export async function createSuggestedSkillPrerequisitesAction(input: unknown) {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await createSkillPrerequisites(input, "AI_SUGGESTION", session.user.memberId);
    revalidatePath("/skills");
  }, "選んだ前提スキルを登録しました。");
}

export async function createManualSkillPrerequisiteAction(input: unknown) {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await createSkillPrerequisite(input, session.user.memberId);
    revalidatePath("/skills");
  }, "前提スキルを登録しました。");
}

export async function deleteSkillPrerequisiteAction(id: string) {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await deleteSkillPrerequisite(id, session.user.memberId);
    revalidatePath("/skills");
  }, "前提スキルを削除しました。");
}
