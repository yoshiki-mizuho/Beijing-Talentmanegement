import { randomUUID } from "node:crypto";

import { buildSkillPrerequisiteMessages, type SkillPrerequisitePromptInput } from "@/modules/ai-evaluation/domain/skill-prerequisite-prompt";
import { parseSkillPrerequisiteSuggestions } from "@/modules/ai-evaluation/domain/skill-prerequisite-suggestion";
import * as jobs from "@/modules/ai-evaluation/infrastructure/ai-job-repository";
import { getSkillPrerequisiteSuggestionContext } from "@/modules/skills/application/skill-service";
import { AI_JOB_DAILY_LIMIT, startOfJstDay } from "@/modules/ai-evaluation/domain/ai-job-policy";
import { getTenantId } from "@/server/db/prisma";
import { generatePlatformText } from "@/server/platform/llm";

const TARGET_LIMIT = 20;
const CANDIDATE_LIMIT = 120;
export const SKILL_PREREQUISITE_JSON_SCHEMA_HINT = '{"suggestions":[{"skill":1,"prerequisite":2,"reason":"string","confidence":"high"}]}';

export async function reserveSkillPrerequisiteSuggestions(scope: "unrelated" | "all", actorMemberId: string) {
  const reservation = await jobs.reserveAiJob({
    tenantId: await getTenantId(), kind: "SKILL_PREREQUISITE", requestedByMemberId: actorMemberId,
    params: { scope }, dayStartedAt: startOfJstDay(new Date()), dailyLimit: AI_JOB_DAILY_LIMIT,
  });
  if (reservation.kind === "daily_limit") return { jobStatus: null, message: "今日の上限に達しました。" };
  return { jobStatus: reservation.job.status, message: "作成を受け付けました。数分後にできます。" };
}

export async function getSkillPrerequisiteSuggestionState() {
  const job = await jobs.findLatestSkillPrerequisiteJob();
  return job ? { status: job.status, result: job.status === "SUCCEEDED" ? job.result : null } : { status: null, result: null };
}

export async function executeSkillPrerequisiteJob(scope: "unrelated" | "all") {
  const { input, candidateSkills, truncated } = await prepareInput(scope);
  const messages = buildSkillPrerequisiteMessages(input);
  const startedAt = Date.now();
  const generated = await generatePlatformText({
    systemPrompt: messages[0].content, userPrompt: messages[1].content,
    jsonSchemaHint: SKILL_PREREQUISITE_JSON_SCHEMA_HINT, requestId: randomUUID(),
  });
  const parsed = parseSkillPrerequisiteSuggestions(generated.text, {
    validNumbers: new Set(input.candidates.map((skill) => skill.number)),
    targetNumbers: new Set(input.targets.map((skill) => skill.number)), existing: input.existing,
  });
  const byNumber = new Map(candidateSkills.map((skill, index) => [index + 1, skill]));
  const suggestions = parsed.flatMap((item) => {
    const skill = byNumber.get(item.skill); const prerequisite = byNumber.get(item.prerequisite);
    return skill && prerequisite ? [{ skillId: skill.id, skillName: skill.name, prerequisiteSkillId: prerequisite.id, prerequisiteSkillName: prerequisite.name, reason: item.reason, confidence: item.confidence }] : [];
  });
  return { model: generated.model, durationMs: Date.now() - startedAt, result: { suggestions, truncated } };
}

async function prepareInput(scope: "unrelated" | "all") {
  const context = await getSkillPrerequisiteSuggestionContext();
  const relatedIds = new Set(context.prerequisites.flatMap((item) => [item.skillId, item.prerequisiteSkillId]));
  const scoped = scope === "unrelated" ? context.skills.filter((skill) => !relatedIds.has(skill.id)) : context.skills;
  const targetIds = new Set(scoped.slice(0, TARGET_LIMIT).map((skill) => skill.id));
  const preferred = [...context.skills.filter((skill) => targetIds.has(skill.id)), ...context.skills.filter((skill) => !targetIds.has(skill.id))];
  let candidateSkills = preferred.slice(0, CANDIDATE_LIMIT);
  let input = makePromptInput(context, candidateSkills, targetIds);
  while (JSON.stringify(input).length > 3_000 && candidateSkills.length > TARGET_LIMIT) {
    candidateSkills = candidateSkills.slice(0, -10); input = makePromptInput(context, candidateSkills, targetIds);
  }
  return { input, candidateSkills, truncated: scoped.length > TARGET_LIMIT || context.skills.length > candidateSkills.length };
}

function makePromptInput(context: Awaited<ReturnType<typeof getSkillPrerequisiteSuggestionContext>>, candidates: Awaited<ReturnType<typeof getSkillPrerequisiteSuggestionContext>>["skills"], targetIds: Set<string>): SkillPrerequisitePromptInput {
  const numberById = new Map(candidates.map((skill, index) => [skill.id, index + 1]));
  return {
    targets: candidates.filter((skill) => targetIds.has(skill.id)).map((skill) => ({ number: numberById.get(skill.id)!, name: skill.name, category: skill.category.name })),
    candidates: candidates.map((skill, index) => ({ number: index + 1, name: skill.name, category: skill.category.name })),
    existing: context.prerequisites.flatMap((pair) => { const skill = numberById.get(pair.skillId); const prerequisite = numberById.get(pair.prerequisiteSkillId); return skill && prerequisite ? [{ skill, prerequisite }] : []; }),
  };
}
