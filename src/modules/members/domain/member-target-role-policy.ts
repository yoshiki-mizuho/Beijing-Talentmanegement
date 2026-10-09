export function canUpdateMemberTargetRole(
  actorRole: "ADMIN" | "MANAGER" | "MEMBER",
  actorMemberId: string,
  targetMemberId: string
) {
  return actorRole === "ADMIN" || actorMemberId === targetMemberId;
}
