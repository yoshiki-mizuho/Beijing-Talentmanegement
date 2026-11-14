import { z } from "zod";

export const MAX_TEMPLATE_BYTES = 1024 * 1024;
export const MAX_TEMPLATE_COUNT = 30;

export const templateNameSchema = z.string().trim().min(1, "名前を入力してください。").max(50);

export function isAdmin(role: string) {
  return role === "ADMIN";
}

export function skillSheetFileName(displayName: string, date: Date) {
  const day = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo"
  }).format(date).replaceAll("-", "");
  return `スキルシート_${displayName.trim() || "member"}_${day}.xlsx`;
}
