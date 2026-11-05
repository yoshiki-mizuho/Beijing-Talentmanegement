export function buildLevelUpReactionNotificationBody(input: {
  actorName: string;
  reactorCount: number;
  skillName: string;
  toLevel: number;
}) {
  const subject = input.reactorCount === 1
    ? `${input.actorName}さんが`
    : `${input.actorName}さんほか ${input.reactorCount - 1}人が`;
  return `${subject} ${input.skillName} Lv${input.toLevel} にリアクションしました`;
}

export function uniqueReplyRecipientIds(
  ownerMemberId: string,
  commenters: Array<{ authorMemberId: string; authorMember: { status: string } }>
) {
  return [...new Set(
    commenters
      .filter((comment) =>
        comment.authorMemberId !== ownerMemberId &&
        comment.authorMember.status === "ACTIVE"
      )
      .map((comment) => comment.authorMemberId)
  )];
}
