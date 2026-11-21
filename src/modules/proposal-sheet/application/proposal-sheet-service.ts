import type { AuthRole } from "@prisma/client";
import { getCareerForProposalSheet } from "@/modules/career/application/career-service";
import { calculateExperienceLabel, formatCareerMonth } from "@/modules/career/domain/career-display";
import { generateProposalSheetText } from "@/modules/ai-evaluation/application/proposal-sheet-service";
import {
  hashProposalSheetInput,
  type ProposalSheetPromptInput,
  type ProposalSheetText
} from "@/modules/ai-evaluation/domain/proposal-sheet";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";
import { displayMemberName } from "@/modules/members/domain/member-display";
import { AuthorizationError } from "@/server/auth/authorization";
import { canAccessProposalSheet, initialProposalDisplayName } from "../domain/proposal-sheet-access";
import {
  keepDescriptionsFor,
  keepKnownIds,
  proposalSheetEditSchema,
  proposalSheetSettingsSchema,
  type ProposalSheetDraftData,
  type ProposalSheetEditInput,
  type ProposalSheetSettingsInput
} from "../domain/proposal-sheet-schema";
import * as repository from "../infrastructure/proposal-sheet-repository";

export type ProposalSheetActor = { memberId: string; role: AuthRole };

export async function assertProposalSheetAccess(actor: ProposalSheetActor, targetMemberId: string) {
  const scope = await getMemberScope(actor.role, actor.memberId);
  if (!canAccessProposalSheet({ role: actor.role, targetIsInScope: memberIsInScope(scope, targetMemberId) })) {
    throw new AuthorizationError("提案用スキルシートを見る権限がありません。", 403);
  }
}

export async function getProposalSheet(actor: ProposalSheetActor, memberId: string) {
  await assertProposalSheetAccess(actor, memberId);
  const [context, career] = await Promise.all([
    repository.getProposalSheetContext(memberId),
    getCareerForProposalSheet(memberId)
  ]);
  if (!context || !career) throw new Error("member_not_found");
  const draft = context.proposalSheetDraft;
  const selectedProjectIds = draft?.projectHistoryIds ?? career.projectHistories.map((item) => item.id);
  const excludedSkillIds = draft?.excludedSkillIds ?? [];
  const input = buildPromptInput(context, career, selectedProjectIds, excludedSkillIds, draft?.customerRequest ?? "");
  return {
    member: { id: context.id, name: displayMemberName(context.name) },
    experienceLabel: calculateExperienceLabel(career.itCareerStartMonth),
    projects: career.projectHistories,
    certifications: career.certifications,
    skills: context.memberSkills.map((item) => ({
      id: item.skillId,
      name: item.skill.name,
      category: item.skill.category.name,
      level: item.level
    })),
    draft: draft ? {
      ...draft,
      projectDescriptions: parseDescriptions(draft.projectDescriptions),
      generatedAt: draft.generatedAt?.toISOString() ?? null,
      isStale: draft.inputHash !== hashProposalSheetInput(input)
    } : null,
    initialDisplayName: initialProposalDisplayName(displayMemberName(context.name))
  };
}

export async function generateProposalSheet(
  actor: ProposalSheetActor,
  raw: ProposalSheetSettingsInput
) {
  await assertProposalSheetAccess(actor, raw.memberId);
  const [context, career] = await Promise.all([
    repository.getProposalSheetContext(raw.memberId),
    getCareerForProposalSheet(raw.memberId)
  ]);
  if (!context || !career) throw new Error("member_not_found");
  const input = sanitizeSettings(proposalSheetSettingsSchema.parse(raw), context, career);
  const promptInput = buildPromptInput(context, career, input.projectHistoryIds, input.excludedSkillIds, input.customerRequest);
  const previous = context.proposalSheetDraft
    ? toPrevious(context.proposalSheetDraft.selfPr, context.proposalSheetDraft.strengths, context.proposalSheetDraft.projectDescriptions)
    : undefined;
  const result = await generateProposalSheetText(actor.memberId, input.memberId, promptInput, previous);
  if (result.keptPrevious) return { ...result, draft: null };
  const generatedAt = new Date().toISOString();
  const saved: ProposalSheetDraftData = {
    ...input,
    selfPr: result.content.selfPr,
    strengths: result.content.strengths,
    projectDescriptions: Object.fromEntries(
      result.content.projects.map((item) => [item.id, item.description])
    ),
    source: result.source,
    inputHash: hashProposalSheetInput(promptInput),
    model: result.model,
    generatedAt
  };
  await repository.saveProposalSheetDraft(actor.memberId, saved, "generate");
  return { ...result, draft: { ...saved, isStale: false } };
}

export async function saveProposalSheet(actor: ProposalSheetActor, raw: ProposalSheetEditInput) {
  await assertProposalSheetAccess(actor, raw.memberId);
  const [context, career] = await Promise.all([
    repository.getProposalSheetContext(raw.memberId),
    getCareerForProposalSheet(raw.memberId)
  ]);
  if (!context || !career) throw new Error("member_not_found");
  const parsed = proposalSheetEditSchema.parse(raw);
  const settings = sanitizeSettings(parsed, context, career);
  const existing = context.proposalSheetDraft;
  // 出どころ・入力のハッシュ・作成日時は、保存済みの下書きの値を引き継ぐ（画面から受け取らない）
  return repository.saveProposalSheetDraft(
    actor.memberId,
    {
      ...settings,
      projectDescriptions: keepDescriptionsFor(
        parsed.projectDescriptions,
        settings.projectHistoryIds
      ),
      source: existing?.source ?? "MANUAL",
      inputHash: existing?.inputHash ?? null,
      model: existing?.model ?? null,
      generatedAt: existing?.generatedAt?.toISOString() ?? null
    },
    "update"
  );
}

// 選んだ経歴・スキルのうち、そのメンバーのものだけを残す
function sanitizeSettings<T extends ProposalSheetSettingsInput>(
  input: T,
  context: NonNullable<Awaited<ReturnType<typeof repository.getProposalSheetContext>>>,
  career: NonNullable<Awaited<ReturnType<typeof getCareerForProposalSheet>>>
): T {
  return {
    ...input,
    projectHistoryIds: keepKnownIds(
      input.projectHistoryIds,
      career.projectHistories.map((item) => item.id)
    ),
    excludedSkillIds: keepKnownIds(
      input.excludedSkillIds,
      context.memberSkills.map((item) => item.skillId)
    )
  };
}

function buildPromptInput(
  context: NonNullable<Awaited<ReturnType<typeof repository.getProposalSheetContext>>>,
  career: NonNullable<Awaited<ReturnType<typeof getCareerForProposalSheet>>>,
  projectHistoryIds: string[],
  excludedSkillIds: string[],
  customerRequest: string
): ProposalSheetPromptInput {
  const selected = new Set(projectHistoryIds);
  const excluded = new Set(excludedSkillIds);
  return {
    itExperienceYears: calculateExperienceLabel(career.itCareerStartMonth),
    note: career.skillSheetNote ?? "",
    customerRequest,
    skills: context.memberSkills.filter((item) => !excluded.has(item.skillId)).map((item) => ({
      id: item.skillId, name: item.skill.name, category: item.skill.category.name, level: item.level
    })),
    projects: career.projectHistories.filter((item) => selected.has(item.id)).map((item) => ({
      id: item.id,
      title: item.title,
      period: `${formatCareerMonth(item.startMonth)}〜${item.endMonth ? formatCareerMonth(item.endMonth) : "現在"}`,
      industry: item.industry,
      summary: item.summary,
      role: item.role,
      teamSize: item.teamSize,
      businessArea: item.businessArea,
      phases: item.phases,
      technologies: item.technologies
    })),
    certifications: career.certifications.map((item) => ({ name: item.name, acquiredMonth: item.acquiredMonth }))
  };
}

function parseDescriptions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((item): item is [string, string] => typeof item[1] === "string"));
}

function toPrevious(selfPr: string, strengths: string, descriptions: unknown): ProposalSheetText {
  return {
    selfPr,
    strengths,
    projects: Object.entries(parseDescriptions(descriptions)).map(([id, description]) => ({ id, description }))
  };
}
