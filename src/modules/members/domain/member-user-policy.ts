import { UserFacingError } from "@/shared/lib/user-facing-error";

export class MemberUserLinkError extends UserFacingError {
  constructor() {
    super("同じメールアドレスのユーザーは、別のメンバーにすでに紐付いています。");
    this.name = "MemberUserLinkError";
  }
}

export function assertUserCanLinkToMember(existingMemberId: string | null, memberId: string) {
  if (existingMemberId && existingMemberId !== memberId) {
    throw new MemberUserLinkError();
  }
}
