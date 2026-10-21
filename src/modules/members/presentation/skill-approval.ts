export type SkillApprovalRow = {
  id: string;
  memberId: string;
  memberName: string;
  avatarUpdatedAt: string | null;
  departmentName: string;
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
  return waitingDays >= 5;
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
    : `現在 Lv${currentLevel} → 申請 Lv${requestedLevel}`;
}

export { getMemberAvatarTone, getMemberInitial } from "@/shared/ui/member-avatar";
