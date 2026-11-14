import { z } from "zod";

import { BUSINESS_AREAS, CAREER_PHASES, CAREER_ROLES, TEAM_SIZES } from "./career-options";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonthInTokyo(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  }).format(now).slice(0, 7);
}

function optionalMonth(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function optionalText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function requiredMonthSchema(label: string) {
  return z.string().regex(monthPattern, `${label}を正しく入力してください。`);
}

function optionalMonthSchema(label: string) {
  return z.preprocess(
    optionalMonth,
    z.string().regex(monthPattern, `${label}を正しく入力してください。`).optional()
  );
}

export function splitTechnologies(value: string) {
  return [...new Set(value.split(/[\/、,]/u).map((item) => item.trim()).filter(Boolean))];
}

export const projectHistorySchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(1, "案件名を入力してください。").max(60),
  startMonth: requiredMonthSchema("開始年月"),
  endMonth: optionalMonthSchema("終了年月"),
  industry: z.string().trim().min(1, "業種を入力してください。").max(50),
  summary: z.string().trim().min(1, "概要を入力してください。").max(500),
  role: z.enum(CAREER_ROLES),
  teamSize: z.enum(TEAM_SIZES),
  businessArea: z.preprocess(optionalText, z.enum(BUSINESS_AREAS).optional()),
  phases: z.array(z.enum(CAREER_PHASES)).min(1, "担当工程を1つ以上選んでください。"),
  technologies: z.string().transform(splitTechnologies).pipe(
    z.array(z.string().max(40, "技術は1件40字以内で入力してください。")).max(20, "技術は20件までです。")
  )
}).superRefine((value, context) => {
  const current = currentMonthInTokyo();
  if (value.startMonth > current) {
    context.addIssue({
      code: "custom",
      path: ["startMonth"],
      message: "開始年月は未来にできません。"
    });
  }
  if (value.endMonth && value.endMonth > current) {
    context.addIssue({
      code: "custom",
      path: ["endMonth"],
      message: "終了年月は未来にできません。"
    });
  }
  if (value.endMonth && value.endMonth < value.startMonth) {
    context.addIssue({
      code: "custom",
      path: ["endMonth"],
      message: "終了年月は開始年月以降にしてください。"
    });
  }
});

export const certificationSchema = z.object({
  name: z.string().trim().min(1, "資格名を入力してください。").max(100),
  acquiredMonth: optionalMonthSchema("取得年月")
}).superRefine((value, context) => {
  if (value.acquiredMonth && value.acquiredMonth > currentMonthInTokyo()) {
    context.addIssue({
      code: "custom",
      path: ["acquiredMonth"],
      message: "取得年月は未来にできません。"
    });
  }
});

export const skillSheetBasicsSchema = z.object({
  itCareerStartMonth: optionalMonthSchema("ITの仕事を始めた年月"),
  skillSheetNote: z.preprocess(optionalText, z.string().max(300).optional())
}).superRefine((value, context) => {
  if (value.itCareerStartMonth && value.itCareerStartMonth > currentMonthInTokyo()) {
    context.addIssue({
      code: "custom",
      path: ["itCareerStartMonth"],
      message: "開始年月は未来にできません。"
    });
  }
});

export type ProjectHistoryInput = {
  id?: string;
  title: string;
  startMonth: string;
  endMonth?: string;
  industry: string;
  summary: string;
  role: string;
  teamSize: string;
  businessArea?: string;
  phases: string[];
  technologies: string;
};
export type ParsedProjectHistory = z.output<typeof projectHistorySchema>;
export type CertificationInput = {
  name: string;
  acquiredMonth?: string;
};
export type ParsedCertification = z.output<typeof certificationSchema>;
export type SkillSheetBasicsInput = {
  itCareerStartMonth?: string;
  skillSheetNote?: string;
};
export type ParsedSkillSheetBasics = z.output<typeof skillSheetBasicsSchema>;
