export type AiUsageMonth = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

const TOKYO_OFFSET_HOURS = 9;

export function getAiUsageMonth(
  value: string | undefined,
  now = new Date(),
): AiUsageMonth {
  const currentKey = formatTokyoMonth(now);
  const requested = /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")
    ? value!
    : currentKey;
  const key = requested > currentKey ? currentKey : requested;
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, -TOKYO_OFFSET_HOURS));
  const end = new Date(Date.UTC(year, month, 1, -TOKYO_OFFSET_HOURS));
  return { key, label: `${year}年${month}月`, start, end };
}

export function formatTokyoMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  return `${year}-${month}`;
}

export function shiftMonth(key: string, amount: number) {
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function calculatePercentage(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

export function getAiMonthlyTokenLimit(
  value = process.env.AI_MONTHLY_TOKEN_LIMIT,
) {
  if (!value || !/^\d+$/.test(value)) return null;
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit > 0 ? limit : null;
}

export function hasReachedMonthlyTokenLimit(
  total: number,
  limit: number | null,
) {
  return limit !== null && total >= limit;
}

const reasonLabels: Record<string, string> = {
  not_configured: "未設定",
  timeout: "時間切れ",
  rate_limited: "混雑（429）",
  http_error: "エラーの応答",
  network: "通信エラー",
  invalid_response: "応答の形式が不正",
  monthly_limit: "月の上限",
};

export function translateAiErrorCode(code: string | null) {
  return code ? (reasonLabels[code] ?? code) : "—";
}
