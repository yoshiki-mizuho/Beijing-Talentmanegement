export function calculateExperienceLabel(startMonth: string | null, now = new Date()) {
  if (!startMonth) return null;
  const [year, month] = startMonth.split("-").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric"
  }).formatToParts(now);
  const currentYear = Number(parts.find((part) => part.type === "year")?.value);
  const currentMonth = Number(parts.find((part) => part.type === "month")?.value);
  const elapsed = (currentYear - year) * 12 + currentMonth - month;
  if (elapsed < 12) return "1年未満";
  return `${Math.floor(elapsed / 12)}年`;
}

export function formatCareerMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  return `${year}年${value}月`;
}
