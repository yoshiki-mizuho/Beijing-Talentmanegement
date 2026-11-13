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
  if (input.nextRole === AuthRole.MEMBER) {
    return getActiveReportError(input.reportCount, "変更できません");
  }
  return null;
}

export function getActiveReportError(
  reportCount: number,
  action: "変更できません" | "無効にできません"
) {
  if (reportCount > 0) {
    if (action === "無効にできません") {
      return "部下がいるメンバーは無効にできません。先に部下の上司を付け替えてください。";
    }
    return `部下が ${reportCount}人いるため変更できません。先に上司を付け替えてください`;
  }
  return null;
}
