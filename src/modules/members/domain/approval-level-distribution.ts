export const APPROVAL_DISTRIBUTION_MINIMUM_GROUP_SIZE = 3;

export type ApprovalLevelDistribution = {
  groupSize: number;
  unregisteredCount: number;
  counts: [number, number, number, number, number] | null;
};

export function buildApprovalLevelDistribution(
  members: Array<{ id: string; level: number | null }>,
  applicantId: string
): ApprovalLevelDistribution {
  const peers = members.filter((member) => member.id !== applicantId);
  const unregisteredCount = peers.filter((member) => member.level === null).length;
  if (peers.length < APPROVAL_DISTRIBUTION_MINIMUM_GROUP_SIZE) {
    return { groupSize: peers.length, unregisteredCount, counts: null };
  }

  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const peer of peers) {
    if (peer.level !== null && peer.level >= 1 && peer.level <= 5) {
      counts[peer.level - 1] += 1;
    }
  }
  return { groupSize: peers.length, unregisteredCount, counts };
}
