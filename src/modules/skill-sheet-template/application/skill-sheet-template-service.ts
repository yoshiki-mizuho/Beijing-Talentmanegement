import type { AuthRole } from "@prisma/client";
import { formatCareerMonth } from "@/modules/career/domain/career-display";
import { getProposalSheet } from "@/modules/proposal-sheet/application/proposal-sheet-service";
import { AuthorizationError } from "@/server/auth/authorization";
import { UserFacingError } from "@/shared/lib/user-facing-error";
import {
  MAX_TEMPLATE_BYTES,
  MAX_TEMPLATE_COUNT,
  isAdmin,
  skillSheetFileName,
  templateNameSchema
} from "../domain/skill-sheet-template";
import type { SkillSheetRepeatingValues } from "../domain/skill-sheet-markers";
import { fillExcelTemplate, inspectExcelTemplate } from "../infrastructure/excel-template";
import * as repository from "../infrastructure/skill-sheet-template-repository";
import { createStandardTemplate } from "../infrastructure/standard-template";

export type TemplateActor = { memberId: string; role: AuthRole };

export async function getTemplateList(actor: TemplateActor) {
  assertAdmin(actor);
  return repository.listTemplates();
}

export async function getAvailableTemplates(actor: TemplateActor) {
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    throw new AuthorizationError("ひな形を選ぶ権限がありません。", 403);
  }
  const templates = await repository.listTemplates();
  return templates.map((item) => ({ id: item.id, name: item.name }));
}

export async function inspectTemplateUpload(actor: TemplateActor, file: File) {
  assertAdmin(actor);
  const content = await validateFile(file);
  try {
    return await inspectExcelTemplate(content);
  } catch {
    throw new UserFacingError("Excel ファイルを読み取れませんでした。");
  }
}

export async function registerTemplate(actor: TemplateActor, name: string, file: File) {
  assertAdmin(actor);
  if (await repository.countTemplates() >= MAX_TEMPLATE_COUNT) {
    throw new UserFacingError("ひな形は30件まで登録できます。");
  }
  const parsedName = templateNameSchema.parse(name);
  const content = await validateFile(file);
  const inspection = await inspectExcelTemplate(content);
  if (inspection.errors.length > 0) throw new UserFacingError(inspection.errors[0]);
  return repository.createTemplate({
    actorMemberId: actor.memberId,
    name: parsedName,
    fileName: file.name,
    content
  });
}

export async function renameTemplate(actor: TemplateActor, id: string, name: string) {
  assertAdmin(actor);
  return repository.updateTemplate({
    actorMemberId: actor.memberId,
    id,
    name: templateNameSchema.parse(name)
  });
}

export async function replaceTemplate(actor: TemplateActor, id: string, file: File) {
  assertAdmin(actor);
  const content = await validateFile(file);
  const inspection = await inspectExcelTemplate(content);
  if (inspection.errors.length > 0) throw new UserFacingError(inspection.errors[0]);
  return repository.updateTemplate({
    actorMemberId: actor.memberId,
    id,
    fileName: file.name,
    content
  });
}

export async function removeTemplate(actor: TemplateActor, id: string) {
  assertAdmin(actor);
  return repository.deleteTemplate(actor.memberId, id);
}

export async function downloadTemplate(actor: TemplateActor, id: string) {
  assertAdmin(actor);
  if (id === "standard") {
    return { name: "TalentHub標準.xlsx", content: await createStandardTemplate() };
  }
  const template = await repository.findTemplate(id);
  if (!template) return null;
  return { name: template.fileName, content: Buffer.from(template.content) };
}

export async function exportProposalSheet(
  actor: TemplateActor,
  memberId: string,
  templateId: string,
  now = new Date()
) {
  const data = await getProposalSheet(actor, memberId);
  if (!data.draft) return null;
  const selectedProjects = new Set(data.draft.projectHistoryIds);
  const excludedSkills = new Set(data.draft.excludedSkillIds);
  const template = templateId === "standard" ? null : await repository.findTemplate(templateId);
  if (templateId !== "standard" && !template) return null;
  const content = template ? Buffer.from(template.content) : await createStandardTemplate();
  const certifications = [...data.certifications].sort((left, right) =>
    (right.acquiredMonth ?? "").localeCompare(left.acquiredMonth ?? "")
  );
  const date = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(now);
  const repeating: SkillSheetRepeatingValues = {
    経歴: data.projects.filter((item) => selectedProjects.has(item.id)).map((item) => ({
      "経歴.期間": `${formatCareerMonth(item.startMonth)}〜${item.endMonth ? formatCareerMonth(item.endMonth) : "現在"}`,
      "経歴.案件名": item.title,
      "経歴.説明": data.draft?.projectDescriptions[item.id] ?? item.summary,
      "経歴.業種": item.industry,
      "経歴.役割": item.role,
      "経歴.規模": item.teamSize,
      "経歴.業務領域": item.businessArea ?? "",
      "経歴.工程": item.phases.join("・"),
      "経歴.技術": item.technologies.join(" / ")
    })),
    スキル: data.skills.filter((item) => !excludedSkills.has(item.id)).map((item) => ({
      "スキル.名前": item.name,
      "スキル.レベル": String(item.level),
      "スキル.カテゴリ": item.category
    })),
    資格: certifications.map((item) => ({
      "資格.名前": item.name,
      "資格.取得年月": item.acquiredMonth ? formatCareerMonth(item.acquiredMonth) : ""
    }))
  };
  const output = await fillExcelTemplate(content, {
    氏名: data.draft.displayName,
    IT経験年数: data.experienceLabel ?? "",
    得意分野: data.draft.strengths,
    自己PR: data.draft.selfPr,
    資格: certifications.map((item) =>
      item.acquiredMonth ? `${item.name}（${formatCareerMonth(item.acquiredMonth)}）` : item.name
    ).join("／"),
    作成日: date
  }, repeating);
  await repository.recordTemplateUse({
    actorMemberId: actor.memberId,
    draftId: data.draft.id,
    templateId: template?.id ?? null,
    templateName: template?.name ?? "TalentHub 標準"
  });
  return {
    name: skillSheetFileName(data.draft.displayName, now),
    content: output
  };
}

function assertAdmin(actor: TemplateActor) {
  if (!isAdmin(actor.role)) throw new AuthorizationError("管理者だけが操作できます。", 403);
}

async function validateFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new UserFacingError(".xlsx ファイルを選んでください。");
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    throw new UserFacingError("ファイルは1MB以下にしてください。");
  }
  const content = new Uint8Array(await file.arrayBuffer());
  if (content[0] !== 0x50 || content[1] !== 0x4b) {
    throw new UserFacingError("Excel ファイルの形式が正しくありません。");
  }
  if (Buffer.from(content).includes(Buffer.from("vbaProject.bin"))) {
    throw new UserFacingError("マクロ付きのファイルは登録できません。");
  }
  return content;
}
