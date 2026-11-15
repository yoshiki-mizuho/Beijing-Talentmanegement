import type {
  MemberListItem,
  MemberRow,
  RoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";

export type TargetRoleFilter = "" | "unset" | "achieved" | "in_progress";

type TargetRoleMember = Pick<
  MemberRow | MemberListItem,
  "targetRoleId" | "targetRole" | "roleAchievements" | "memberSkills"
>;

export function evaluateMemberTargetRole(member: TargetRoleMember, roles: RoleOption[]) {
  const role = roles.find((item) => item.id === member.targetRoleId);
  if (!member.targetRole || !role) return null;

  return evaluateRoleAchievement(role.roleRequirements, member.memberSkills);
}

export function matchesTargetRoleFilter(
  member: TargetRoleMember,
  roles: RoleOption[],
  filter: TargetRoleFilter
) {
  if (!filter) return true;
  const evaluation = evaluateMemberTargetRole(member, roles);
  if (filter === "unset") return evaluation === null;
  const recorded = member.targetRoleId !== null && member.roleAchievements.some(
    (achievement) => achievement.roleId === member.targetRoleId
  );
  if (filter === "achieved") return recorded;
  return evaluation !== null && !recorded;
}

export function parseTargetRoleFilter(value: string | string[] | undefined): TargetRoleFilter {
  return value === "unset" || value === "achieved" || value === "in_progress" ? value : "";
}
