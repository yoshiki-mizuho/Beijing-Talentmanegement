export type SkillApprovalRow = {
  id: string;
  memberId: string;
  memberName: string;
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
    ? `未保有 → Lv${requestedLevel}`
    : `現在 Lv${currentLevel} → 申告 Lv${requestedLevel}`;
}

export function getMemberInitial(name: string) {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("ja") ?? "?";
}

export function getMemberAvatarTone(memberId: string) {
  const tones = [
    "bg-teal-100 text-teal-800",
    "bg-sky-100 text-sky-800",
    "bg-violet-100 text-violet-800",
    "bg-amber-100 text-amber-800",
    "bg-rose-100 text-rose-800"
  ] as const;
  const hash = Array.from(memberId).reduce(
    (total, character) => total + character.codePointAt(0)!,
    0
  );

  return tones[hash % tones.length];
}
