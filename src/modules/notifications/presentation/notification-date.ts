const defaultTimeZone = "Asia/Tokyo";

export function formatNotificationDate(
  value: Date,
  now: Date = new Date(),
  timeZone = defaultTimeZone
) {
  const valueParts = getDateParts(value, timeZone);
  const dayDifference = getDayNumber(now, timeZone) - getDayNumber(value, timeZone);

  if (dayDifference === 0) {
    const time = new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone
    }).format(value);

    return `今日 ${time}`;
  }

  if (dayDifference === 1) return "昨日";

  return `${String(valueParts.month).padStart(2, "0")}/${String(valueParts.day).padStart(2, "0")}`;
}

function getDayNumber(value: Date, timeZone: string) {
  const { year, month, day } = getDateParts(value, timeZone);

  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function getDateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone
  }).formatToParts(value);
  const numberByType = new Map(
    parts.map((part) => [part.type, Number.parseInt(part.value, 10)])
  );

  return {
    year: numberByType.get("year")!,
    month: numberByType.get("month")!,
    day: numberByType.get("day")!
  };
}
