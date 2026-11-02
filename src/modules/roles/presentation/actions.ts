"use server";

import { revalidatePath } from "next/cache";

import {
  createRoleWithRequirements,
  deactivateRole,
  deleteRole,
  updateRoleWithRequirements
} from "@/modules/roles/application/role-service";
import { adminOnly, requireRoles } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getOptionalString, getString } from "@/shared/lib/form-data";

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
    const requirements = JSON.parse(
      getOptionalString(formData, "requirements") ?? "[]"
    ) as unknown;
    await updateRoleWithRequirements(
      getString(formData, "id"),
      parseRoleForm(formData),
      requirements,
      session.user.memberId
    );
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
