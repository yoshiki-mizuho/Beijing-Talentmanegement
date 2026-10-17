import { AuthRole } from "@prisma/client";

export function getMemberRoleChangeError(input: {
  actorMemberId: string;
  targetMemberId: string;
  currentRole: AuthRole;
  nextRole: AuthRole;
  activeAdminCount: number;
  targetIsActive: boolean;
  reportCount: number;
}) {
  if (input.actorMemberId === input.targetMemberId) {
    return "自分の権限は変更できません";
  }
  if (input.currentRole === input.nextRole) {
    return null;
  }
  if (
    input.currentRole === AuthRole.ADMIN &&
    input.targetIsActive &&
    input.nextRole !== AuthRole.ADMIN &&
    input.activeAdminCount <= 1
  ) {
    return "管理者が1人もいなくなるため変更できません";
  }
  if (input.nextRole === AuthRole.MEMBER && input.reportCount > 0) {
    return `部下が ${input.reportCount}人いるため変更できません。先に上司を付け替えてください`;
  }
  return null;
}
