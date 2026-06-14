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
import { getNumber, getOptionalString, getString } from "@/shared/lib/form-data";

function parseRoleForm(formData: FormData) {
  return {
    name: getString(formData, "name"),
    description: getOptionalString(formData, "description"),
    isActive: formData.get("isActive") === "on"
  };
}

export async function createRoleAction(formData: FormData) {
  await requireRoles(adminOnly);
  await createRole(parseRoleForm(formData));
  revalidatePath("/roles");
}

export async function updateRoleAction(formData: FormData) {
  await requireRoles(adminOnly);
  await updateRole(getString(formData, "id"), parseRoleForm(formData));
  revalidatePath("/roles");
}

export async function deactivateRoleAction(formData: FormData) {
  await requireRoles(adminOnly);
  await deactivateRole(getString(formData, "id"));
  revalidatePath("/roles");
}

export async function setRoleRequirementAction(formData: FormData) {
  await requireRoles(adminOnly);
  await setRoleRequirement({
    roleId: getString(formData, "roleId"),
    skillId: getString(formData, "skillId"),
    requiredLevel: getNumber(formData, "requiredLevel"),
    isRequired: formData.get("isRequired") === "on"
  });
  revalidatePath("/roles");
}

export async function removeRoleRequirementAction(formData: FormData) {
  await requireRoles(adminOnly);
  await removeRoleRequirement(getString(formData, "roleId"), getString(formData, "skillId"));
  revalidatePath("/roles");
}
