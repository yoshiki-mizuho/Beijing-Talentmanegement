export const APPROVAL_LEVEL_GAP_THRESHOLD = 2;
export const APPROVAL_RESUBMIT_DAYS = 30;

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export type ApprovalCheckPoint = {
  type: "prerequisite" | "jump" | "resubmit" | "rejected";
  label: string;
  detail: string;
};

export type ApprovalHistoryItem = {
  requestedLevel: number;
  status: string;
  managerComment: string | null;
  reviewedAt: Date | string | null;
};

export function getApprovalCheckPoints({
  requestedLevel,
  currentLevel,
  prerequisites,
  previousAssessment,
  submittedAt
}: {
  requestedLevel: number;
  currentLevel: number | null;
  prerequisites: Array<{
    name: string;
    currentLevel: number | null;
  }>;
  previousAssessment: ApprovalHistoryItem | null;
  submittedAt: Date | string;
}): ApprovalCheckPoint[] {
  const checkPoints: ApprovalCheckPoint[] = [];

  for (const prerequisite of prerequisites) {
    const prerequisiteLevel = prerequisite.currentLevel ?? 0;
    const gap = requestedLevel - prerequisiteLevel;
    if (gap < APPROVAL_LEVEL_GAP_THRESHOLD) continue;

    checkPoints.push({
      type: "prerequisite",
      label: "前提スキルとの差",
      detail: prerequisite.currentLevel === null
        ? `前提の${prerequisite.name}が未登録です。`
        : `前提の${prerequisite.name}がLv${prerequisite.currentLevel}です。申請のLv${requestedLevel}と${gap}段の差があります。`
    });
  }

  if (
    currentLevel !== null
    && requestedLevel - currentLevel >= APPROVAL_LEVEL_GAP_THRESHOLD
  ) {
    checkPoints.push({
      type: "jump",
      label: "2段以上の上昇",
      detail: `Lv${currentLevel}からLv${requestedLevel}へ、${requestedLevel - currentLevel}段の上昇です。`
    });
  }

  if (previousAssessment?.status === "REJECTED") {
    const reviewedAt = previousAssessment.reviewedAt
      ? new Date(previousAssessment.reviewedAt)
      : null;
    const elapsedMilliseconds = reviewedAt
      ? new Date(submittedAt).getTime() - reviewedAt.getTime()
      : null;
    const elapsedDays = elapsedMilliseconds === null
      ? null
      : Math.floor(elapsedMilliseconds / millisecondsPerDay);

    if (
      reviewedAt
      && elapsedMilliseconds !== null
      && elapsedMilliseconds >= 0
      && elapsedMilliseconds <= APPROVAL_RESUBMIT_DAYS * millisecondsPerDay
    ) {
      checkPoints.push({
        type: "resubmit",
        label: "短い間の再申請",
        detail: `前回の差し戻し（${formatShortDate(reviewedAt)}）から${elapsedDays}日で再申請です。`
      });
    }

    checkPoints.push({
      type: "rejected",
      label: "差し戻しあり",
      detail: previousAssessment.managerComment
        ? `前回のコメント：「${previousAssessment.managerComment}」`
        : "前回は差し戻しでした。"
    });
  }

  return checkPoints;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo"
  }).format(date);
}
