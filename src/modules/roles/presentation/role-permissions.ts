import type { AppRole } from "@/shared/auth/app-access";

export function canManageRoles(role: AppRole) {
  return role === "ADMIN";
}
