export type SkillApprovalRow = {
  id: string;
  memberId: string;
  memberName: string;
  avatarUpdatedAt: string | null;
  departmentName: string;
  targetRoleName: string | null;
  jobTitle: string | null;
  skillName: string;
  categoryName: string;
  currentLevel: number | null;
  requestedLevel: number;
  yearsOfExperience: string | null;
  submittedAt: string;
  submittedDateLabel: string;
  waitingDays: number;
  targetRequiredLevel: number | null;
  applicantComment: string | null;
  checkPoints: Array<{
    type: "prerequisite" | "jump" | "resubmit" | "rejected";
    label: string;
    detail: string;
  }>;
  departmentDistribution: SkillApprovalDistribution;
  targetRoleDistribution: SkillApprovalDistribution | null;
  history: Array<{
    id: string;
    dateLabel: string;
    requestedLevel: number;
    resultLabel: string;
  }>;
};

export type SkillApprovalDistribution = {
  groupSize: number;
  unregisteredCount: number;
  counts: [number, number, number, number, number] | null;
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function getSkillApprovalWaitingDays(
  submittedAt: Date | string,
  now: Date = new Date()
) {
  return Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(submittedAt).getTime()) / millisecondsPerDay
    )
  );
}

export function isSkillApprovalLongWaiting(waitingDays: number) {
  return waitingDays >= 7;
}

export function formatSkillApprovalDate(submittedAt: Date | string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo"
  }).format(new Date(submittedAt));
}

export function getSkillApprovalLevelChange(
  currentLevel: number | null,
  requestedLevel: number
) {
  return currentLevel === null
    ? `未登録 → Lv${requestedLevel}`
    : `Lv${currentLevel} → Lv${requestedLevel}`;
}

export { getMemberAvatarTone, getMemberInitial } from "@/shared/ui/member-avatar";
