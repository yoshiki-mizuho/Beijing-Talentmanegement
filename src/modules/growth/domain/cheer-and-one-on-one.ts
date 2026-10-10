export type MentorCandidate = {
  id: string;
  name: string;
  status: string;
  level: number;
};

export function buildCheerMessage(input: {
  memberName: string;
  roleName: string;
  skillName: string;
  requiredLevel: number;
}) {
  return `${input.memberName}さん、${input.roleName}まであと一歩ですね。${input.skillName}の Lv${input.requiredLevel} に向けて応援しています！`;
}

export function selectMentorCandidates(
  candidates: readonly MentorCandidate[],
  excludedMemberIds: readonly string[],
  limit = 5
) {
  const excluded = new Set(excludedMemberIds);
  return candidates
    .filter((candidate) =>
      candidate.status === "ACTIVE" &&
      candidate.level >= 4 &&
      !excluded.has(candidate.id)
    )
    .sort((left, right) => right.level - left.level || left.name.localeCompare(right.name, "ja"))
    .slice(0, limit);
}

export function sortOneOnOneNotes<T extends { discussedAt: Date | string | null; createdAt: Date | string }>(
  notes: readonly T[]
) {
  return [...notes].sort((left, right) => {
    if (left.discussedAt === null && right.discussedAt !== null) return -1;
    if (left.discussedAt !== null && right.discussedAt === null) return 1;
    const leftDate = left.discussedAt ?? left.createdAt;
    const rightDate = right.discussedAt ?? right.createdAt;
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
}
