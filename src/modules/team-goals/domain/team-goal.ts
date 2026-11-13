import { z } from "zod";

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

export const teamGoalInputSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["LEVEL_UP_COUNT", "LEVEL_UP_MEMBERS", "SKILL_REACH"]),
  skillId: z.string().nullable().optional(),
  targetLevel: z.number().int().min(1).max(5).nullable().optional(),
  targetCount: z.number().int().min(1).max(999),
  note: z.string().trim().max(60).nullable().optional(),
  months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)])
}).superRefine((value, context) => {
  if (value.kind === "SKILL_REACH" && (!value.skillId || !value.targetLevel)) {
    context.addIssue({ code: "custom", message: "スキルとレベルを選んでください。" });
  }
});

export type TeamGoalKindValue = "LEVEL_UP_COUNT" | "LEVEL_UP_MEMBERS" | "SKILL_REACH";

export function getTokyoMonth(date: Date) {
  const tokyo = new Date(date.getTime() + TOKYO_OFFSET_MS);
  return `${tokyo.getUTCFullYear()}-${String(tokyo.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getTeamGoalPeriod(startMonth: string, months: number) {
  const [year, month] = startMonth.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1) - TOKYO_OFFSET_MS);
  const end = new Date(Date.UTC(year, month - 1 + months, 1) - TOKYO_OFFSET_MS);
  return { start, end };
}

export function isDateInTeamGoalPeriod(date: Date, startMonth: string, months: number) {
  const { start, end } = getTeamGoalPeriod(startMonth, months);
  return date >= start && date < end;
}

export function getPreviousTeamGoalPeriod(startMonth: string, months: number) {
  const current = getTeamGoalPeriod(startMonth, months);
  const [year, month] = startMonth.split("-").map(Number);
  const previousStart = new Date(Date.UTC(year, month - 1 - months, 1) - TOKYO_OFFSET_MS);
  return { start: previousStart, end: current.start };
}

export function getRemainingDays(now: Date, end: Date) {
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export function formatTeamGoalRange(startMonth: string, months: number) {
  const month = Number(startMonth.slice(5));
  if (months === 1) return `${month}月`;
  const endMonth = ((month - 2 + months) % 12) + 1;
  return `${month}月〜${endMonth}月`;
}

export function formatTeamGoalPeriod(startMonth: string, months: number) {
  return `${formatTeamGoalRange(startMonth, months)}のチーム目標`;
}

export function formatTeamGoalText(input: {
  kind: TeamGoalKindValue;
  targetCount: number;
  targetLevel: number | null;
  skillName: string | null;
}) {
  if (input.kind === "LEVEL_UP_COUNT") return `レベルアップ ${input.targetCount}件`;
  if (input.kind === "LEVEL_UP_MEMBERS") return `レベルアップした人 ${input.targetCount}人`;
  return `${input.skillName ?? "スキル"} Lv${input.targetLevel} 以上 ${input.targetCount}人`;
}

export function teamGoalUnit(kind: TeamGoalKindValue) {
  return kind === "LEVEL_UP_COUNT" ? "件" : "人";
}
