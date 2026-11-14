import type { AuthRole } from "@prisma/client";

export function canAccessMemberCareer(input: {
  role: AuthRole;
  viewerMemberId: string;
  targetMemberId: string;
  targetIsInScope: boolean;
}) {
  if (input.role === "ADMIN") return true;
  if (input.viewerMemberId === input.targetMemberId) return true;
  return input.role === "MANAGER" && input.targetIsInScope;
}
