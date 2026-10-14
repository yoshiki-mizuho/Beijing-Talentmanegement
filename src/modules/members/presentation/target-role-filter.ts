import type {
  MemberRow,
  RoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

export type TargetRoleFilter = "" | "unset" | "achieved" | "in_progress";

export function evaluateMemberTargetRole(member: MemberRow, roles: RoleOption[]) {
  const role = roles.find((item) => item.id === member.targetRoleId);
  if (!member.targetRole || !role) return null;

  return evaluateRoleAchievement(role.roleRequirements, member.memberSkills);
}

export function matchesTargetRoleFilter(
  member: MemberRow,
  roles: RoleOption[],
  filter: TargetRoleFilter
) {
  if (!filter) return true;
  const evaluation = evaluateMemberTargetRole(member, roles);
  if (filter === "unset") return evaluation === null;
  if (filter === "achieved") return evaluation?.achieved === true;
  return evaluation?.achieved === false;
}

export function parseTargetRoleFilter(value: string | string[] | undefined): TargetRoleFilter {
  return value === "unset" || value === "achieved" || value === "in_progress" ? value : "";
}
