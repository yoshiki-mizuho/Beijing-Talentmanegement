"use server";

import { revalidatePath } from "next/cache";

import {
  createRole,
  deactivateRole,
  removeRoleRequirement,
  setRoleRequirement,
  updateRole
} from "@/modules/roles/application/role-service";
import { adminOnly, requireRoles } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getNumber, getOptionalString, getString } from "@/shared/lib/form-data";

function parseRoleForm(formData: FormData) {
  return {
    name: getString(formData, "name"),
    description: getOptionalString(formData, "description"),
    isActive: formData.get("isActive") === "on"
  };
}

export async function createRoleAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await createRole(parseRoleForm(formData));
    revalidatePath("/roles");
  }, "ロールを登録しました。");
}

export async function updateRoleAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await updateRole(getString(formData, "id"), parseRoleForm(formData));
    revalidatePath("/roles");
  }, "ロールを更新しました。");
}

export async function deactivateRoleAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await deactivateRole(getString(formData, "id"));
    revalidatePath("/roles");
  }, "ロールを無効化しました。");
}

export async function setRoleRequirementAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    const isRequired = formData.get("isRequired");
    await setRoleRequirement({
      roleId: getString(formData, "roleId"),
      skillId: getString(formData, "skillId"),
      requiredLevel: getNumber(formData, "requiredLevel"),
      isRequired: isRequired === null ? true : isRequired === "true"
    });
    revalidatePath("/roles");
  }, "ロール要件を設定しました。");
}

export async function removeRoleRequirementAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireRoles(adminOnly);
    await removeRoleRequirement(getString(formData, "roleId"), getString(formData, "skillId"));
    revalidatePath("/roles");
  }, "ロール要件を削除しました。");
}
