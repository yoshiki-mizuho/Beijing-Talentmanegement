"use server";

import { revalidatePath } from "next/cache";

import {
  createRoleWithRequirements,
  deactivateRole,
  deleteRole,
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
    const session = await requireRoles(adminOnly);
    const requirements = JSON.parse(
      getOptionalString(formData, "requirements") ?? "[]"
    ) as unknown;
    await createRoleWithRequirements(
      parseRoleForm(formData),
      requirements,
      session.user.memberId
    );
    revalidatePath("/roles");
  }, "ロールを登録しました。");
}

export async function updateRoleAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await updateRole(getString(formData, "id"), parseRoleForm(formData), session.user.memberId);
    revalidatePath("/roles");
  }, "ロールを更新しました。");
}

export async function deactivateRoleAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await deactivateRole(getString(formData, "id"), session.user.memberId);
    revalidatePath("/roles");
  }, "ロールを無効化しました。");
}

export async function deleteRoleAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await deleteRole(getString(formData, "id"), session.user.memberId);
    revalidatePath("/roles");
    revalidatePath("/members");
  }, "ロールを削除しました。");
}

export async function setRoleRequirementAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    const isRequired = formData.get("isRequired");
    await setRoleRequirement({
      roleId: getString(formData, "roleId"),
      skillId: getString(formData, "skillId"),
      requiredLevel: getNumber(formData, "requiredLevel"),
      isRequired: isRequired === null ? true : isRequired === "true"
    }, session.user.memberId);
    revalidatePath("/roles");
  }, "ロール要件を設定しました。");
}

export async function removeRoleRequirementAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireRoles(adminOnly);
    await removeRoleRequirement(
      getString(formData, "roleId"),
      getString(formData, "skillId"),
      session.user.memberId
    );
    revalidatePath("/roles");
  }, "ロール要件を削除しました。");
}
