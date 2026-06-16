export class MemberUserLinkError extends Error {
  constructor() {
    super("User with the same email is already linked to another member.");
    this.name = "MemberUserLinkError";
  }
}

export function assertUserCanLinkToMember(existingMemberId: string | null, memberId: string) {
  if (existingMemberId && existingMemberId !== memberId) {
    throw new MemberUserLinkError();
  }
}
