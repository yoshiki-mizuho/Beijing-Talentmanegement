import type { AppRole } from "@/shared/auth/app-access";

export function canManageSkillMaster(role: AppRole) {
  return role === "ADMIN";
}