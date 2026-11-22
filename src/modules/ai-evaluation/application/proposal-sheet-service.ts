import { randomUUID } from "node:crypto";

import { buildProposalSheetMessages, hashProposalSheetInput, parseProposalSheetResponse, type ProposalSheetPromptInput } from "@/modules/ai-evaluation/domain/proposal-sheet";
import { AI_JOB_DAILY_LIMIT, startOfJstDay } from "@/modules/ai-evaluation/domain/ai-job-policy";
import * as jobs from "@/modules/ai-evaluation/infrastructure/ai-job-repository";
import { getTenantId } from "@/server/db/prisma";
import { generatePlatformText } from "@/server/platform/llm";

// 提案用スキルシートのモジュールが使う予約の口（他モジュールの infrastructure に直接依存させないため）。
export function findLatestProposalSheetJob(targetMemberId: string) {
  return jobs.findLatestProposalSheetJob(targetMemberId);
}

export async function reserveProposalSheetJob(input: {
  targetMemberId: string;
  requestedByMemberId: string;
}) {
  return jobs.reserveAiJob({
    tenantId: await getTenantId(),
    kind: "PROPOSAL_SHEET",
    targetMemberId: input.targetMemberId,
    requestedByMemberId: input.requestedByMemberId,
    params: {},
    dayStartedAt: startOfJstDay(new Date()),
    dailyLimit: AI_JOB_DAILY_LIMIT,
  });
}

export const PROPOSAL_SHEET_JSON_SCHEMA_HINT = '{"selfPr":"string","strengths":"string","projects":[{"id":"string","description":"string"}]}';

export function limitProposalSheetInput(input: ProposalSheetPromptInput) {
  const limited: ProposalSheetPromptInput = {
    ...input,
    note: input.note.slice(0, 500),
    customerRequest: input.customerRequest.slice(0, 500),
    skills: input.skills.slice(0, 30),
    projects: input.projects.slice(0, 15).map((project) => ({
      ...project,
      summary: project.summary.slice(0, 300),
      technologies: project.technologies.slice(0, 10),
      phases: project.phases.slice(0, 8),
    })),
    certifications: input.certifications.slice(0, 20),
  };
  while (JSON.stringify(limited).length > 3_000) {
    const project = limited.projects.at(-1);
    if (project && project.summary.length > 80) project.summary = project.summary.slice(0, -50);
    else if (limited.projects.length > 1) limited.projects.pop();
    else if (limited.skills.length > 1) limited.skills.pop();
    else break;
  }
  return limited;
}

export async function executeProposalSheetJob(input: ProposalSheetPromptInput) {
  const limited = limitProposalSheetInput(input);
  const messages = buildProposalSheetMessages(limited);
  const startedAt = Date.now();
  const generated = await generatePlatformText({
    systemPrompt: messages[0].content,
    userPrompt: messages[1].content,
    jsonSchemaHint: PROPOSAL_SHEET_JSON_SCHEMA_HINT,
    requestId: randomUUID(),
  });
  return {
    model: generated.model,
    durationMs: Date.now() - startedAt,
    result: { content: parseProposalSheetResponse(generated.text, limited), inputHash: hashProposalSheetInput(input) },
  };
}
