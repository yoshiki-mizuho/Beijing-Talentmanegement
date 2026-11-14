import type { AuthRole } from "@prisma/client";

export function canAccessProposalSheet(input: {
  role: AuthRole;
  targetIsInScope: boolean;
}) {
  return input.role === "ADMIN" || (input.role === "MANAGER" && input.targetIsInScope);
}

export function initialProposalDisplayName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || parts.some((part) => !/^[A-Za-z]+$/.test(part))) return "";
  return `${parts.map((part) => part[0].toUpperCase()).join(".")}.`;
}
