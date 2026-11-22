import type { AuthRole } from "@prisma/client";
import { getCareerForProposalSheet } from "@/modules/career/application/career-service";
import { calculateExperienceLabel, formatCareerMonth } from "@/modules/career/domain/career-display";
import { createFallbackProposalSheet } from "@/modules/ai-evaluation/domain/proposal-sheet";
import * as jobs from "@/modules/ai-evaluation/application/proposal-sheet-service";
import {
  hashProposalSheetInput,
  type ProposalSheetPromptInput,
  type ProposalSheetText
} from "@/modules/ai-evaluation/domain/proposal-sheet";
import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";
import { displayMemberName } from "@/modules/members/domain/member-display";
import { resolveMemberProfiles } from "@/modules/members/application/member-directory";
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
  const [context, career, profiles] = await Promise.all([
    repository.getProposalSheetContext(memberId),
    getCareerForProposalSheet(memberId),
    resolveMemberProfiles([memberId])
  ]);
  if (!context || !career) throw new Error("member_not_found");
  const draft = context.proposalSheetDraft;
  const selectedProjectIds = draft?.projectHistoryIds ?? career.projectHistories.map((item) => item.id);
  const excludedSkillIds = draft?.excludedSkillIds ?? [];
  const input = buildPromptInput(context, career, selectedProjectIds, excludedSkillIds, draft?.customerRequest ?? "");
  return {
    member: { id: context.id, name: displayMemberName(profiles.get(memberId)?.name) },
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
    initialDisplayName: initialProposalDisplayName(displayMemberName(profiles.get(memberId)?.name)),
    aiJob: toJobView(await jobs.findLatestProposalSheetJob(memberId))
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
  const previous = context.proposalSheetDraft;
  const saved: ProposalSheetDraftData = {
    ...input,
    selfPr: previous?.selfPr ?? "",
    strengths: previous?.strengths ?? "",
    projectDescriptions: parseDescriptions(previous?.projectDescriptions),
    source: previous?.source ?? "MANUAL",
    inputHash: previous?.inputHash ?? null,
    model: previous?.model ?? null,
    generatedAt: previous?.generatedAt?.toISOString() ?? null
  };
  await repository.saveProposalSheetDraft(actor.memberId, saved, "generate");
  const reservation = await jobs.reserveProposalSheetJob({
    targetMemberId: input.memberId,
    requestedByMemberId: actor.memberId,
  });
  if (reservation.kind === "daily_limit") {
    return { message: "今日の上限に達しました。", jobStatus: null };
  }
  return {
    message: "作成を受け付けました。数分後にできます。",
    jobStatus: reservation.job.status,
  };
}

export async function buildProposalSheetJobInput(memberId: string) {
  const [context, career] = await Promise.all([
    repository.getProposalSheetContext(memberId),
    getCareerForProposalSheet(memberId)
  ]);
  if (!context || !career || !context.proposalSheetDraft) throw new Error("proposal_sheet_draft_not_found");
  const draft = context.proposalSheetDraft;
  return buildPromptInput(context, career, draft.projectHistoryIds, draft.excludedSkillIds, draft.customerRequest);
}

export async function createFallbackProposalSheetForEditor(actor: ProposalSheetActor, memberId: string) {
  await assertProposalSheetAccess(actor, memberId);
  return createFallbackProposalSheet(await buildProposalSheetJobInput(memberId));
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
  const appliedJob = parsed.aiJobId
    ? await jobs.findLatestProposalSheetJob(raw.memberId)
    : null;
  const appliedResult = appliedJob && appliedJob.id === parsed.aiJobId && appliedJob.status === "SUCCEEDED"
    ? parseProposalJobResult(appliedJob.result)
    : null;
  return repository.saveProposalSheetDraft(
    actor.memberId,
    {
      ...settings,
      projectDescriptions: keepDescriptionsFor(
        parsed.projectDescriptions,
        settings.projectHistoryIds
      ),
      source: appliedResult ? "AI" : existing?.source ?? "MANUAL",
      inputHash: appliedResult?.inputHash ?? existing?.inputHash ?? null,
      model: appliedResult && appliedJob ? appliedJob.model : existing?.model ?? null,
      generatedAt: appliedResult && appliedJob ? appliedJob.finishedAt?.toISOString() ?? null : existing?.generatedAt?.toISOString() ?? null
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

function parseProposalJobResult(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as { content?: ProposalSheetText; inputHash?: unknown };
  return result.content && typeof result.inputHash === "string" ? { ...result, inputHash: result.inputHash } : null;
}

function toJobView(job: Awaited<ReturnType<typeof jobs.findLatestProposalSheetJob>>) {
  if (!job) return null;
  const result = job.status === "SUCCEEDED" ? parseProposalJobResult(job.result) : null;
  return { id: job.id, status: job.status, result: result?.content ?? null };
}
