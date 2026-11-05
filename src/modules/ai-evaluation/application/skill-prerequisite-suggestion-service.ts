import {
  buildSkillPrerequisiteMessages,
  createFakeSkillPrerequisiteResponse,
  type SkillPrerequisitePromptInput,
} from "@/modules/ai-evaluation/domain/skill-prerequisite-prompt";
import { parseSkillPrerequisiteSuggestions } from "@/modules/ai-evaluation/domain/skill-prerequisite-suggestion";
import {
  getAiMonthlyTokenLimit,
  getAiUsageMonth,
  hasReachedMonthlyTokenLimit,
} from "@/modules/ai-evaluation/domain/ai-usage-summary";
import {
  AiClientError,
  createChatCompletion,
  getAiConfig,
} from "@/modules/ai-evaluation/infrastructure/ai-client";
import * as usageRepository from "@/modules/ai-evaluation/infrastructure/ai-usage-repository";
import { getSkillPrerequisiteSuggestionContext } from "@/modules/skills/application/skill-service";

const FEATURE = "skill_prerequisite_suggestion";

export async function generateSkillPrerequisiteSuggestions(
  scope: "unrelated" | "all",
  actorMemberId: string,
) {
  const startedAt = Date.now();
  const context = await getSkillPrerequisiteSuggestionContext();
  const relatedIds = new Set(
    context.prerequisites.flatMap((item) => [
      item.skillId,
      item.prerequisiteSkillId,
    ]),
  );
  const scoped =
    scope === "unrelated"
      ? context.skills.filter((skill) => !relatedIds.has(skill.id))
      : context.skills;
  const targetSkills = scoped.slice(0, 150);
  const candidateSkills = context.skills.slice(0, 400);
  const includedIds = new Set(candidateSkills.map((skill) => skill.id));
  const numberById = new Map(
    candidateSkills.map((skill, index) => [skill.id, index + 1]),
  );
  const input: SkillPrerequisitePromptInput = {
    targets: targetSkills.flatMap((skill) => {
      const number = numberById.get(skill.id);
      return number
        ? [
            {
              number,
              name: skill.name,
              category: skill.category.name,
              description: skill.description?.slice(0, 200) || undefined,
            },
          ]
        : [];
    }),
    candidates: candidateSkills.map((skill, index) => ({
      number: index + 1,
      name: skill.name,
      category: skill.category.name,
    })),
    existing: context.prerequisites.flatMap((pair) => {
      const skill = numberById.get(pair.skillId);
      const prerequisite = numberById.get(pair.prerequisiteSkillId);
      return skill && prerequisite ? [{ skill, prerequisite }] : [];
    }),
  };
  const truncated = scoped.length > 150 || context.skills.length > 400;
  const config = getAiConfig();
  const tokenLimit = getAiMonthlyTokenLimit();
  if (tokenLimit !== null) {
    const used = await usageRepository.sumAiTokensSince(
      getAiUsageMonth(undefined).start,
    );
    if (hasReachedMonthlyTokenLimit(used, tokenLimit)) {
      await logFailure("monthly_limit");
      return unavailable(
        "今月の AI の利用上限に達したため、候補を作れませんでした。",
        truncated,
      );
    }
  }
  if (config.kind === "none") {
    await logFailure("not_configured");
    return unavailable(
      "AI が未設定のため、候補を作れませんでした。",
      truncated,
    );
  }
  try {
    const result = await createChatCompletion({
      messages: buildSkillPrerequisiteMessages(input),
      fakeResponse: () => createFakeSkillPrerequisiteResponse(input),
    });
    const parsed = parseSkillPrerequisiteSuggestions(result.content, {
      validNumbers: new Set(input.candidates.map((skill) => skill.number)),
      targetNumbers: new Set(input.targets.map((skill) => skill.number)),
      existing: input.existing,
    });
    const byNumber = new Map(
      candidateSkills.map((skill, index) => [index + 1, skill]),
    );
    const suggestions = parsed.flatMap((item) => {
      const skill = byNumber.get(item.skill);
      const prerequisite = byNumber.get(item.prerequisite);
      return skill && prerequisite && includedIds.has(skill.id)
        ? [
            {
              skillId: skill.id,
              skillName: skill.name,
              prerequisiteSkillId: prerequisite.id,
              prerequisiteSkillName: prerequisite.name,
              reason: item.reason,
              confidence: item.confidence,
            },
          ]
        : [];
    });
    await usageRepository.recordAiUsage({
      feature: FEATURE,
      actorMemberId,
      model: result.model,
      status: "SUCCESS",
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      totalTokens: result.usage?.totalTokens,
      latencyMs: result.latencyMs,
    });
    return { suggestions, message: null, truncated };
  } catch (error) {
    const code = errorCode(error);
    await logFailure(code);
    return unavailable(
      code === "invalid_response"
        ? "AI の応答を読み取れなかったため、候補を作れませんでした。もう一度試してください。"
        : "AI が混み合っていたため、候補を作れませんでした。時間をおいて試してください。",
      truncated,
    );
  }

  function logFailure(errorCode: string) {
    return usageRepository.recordAiUsage({
      feature: FEATURE,
      actorMemberId,
      status: "FAILED",
      latencyMs: Date.now() - startedAt,
      errorCode,
    });
  }
}

function unavailable(message: string, truncated: boolean) {
  return { suggestions: [], message, truncated };
}

function errorCode(error: unknown) {
  if (!(error instanceof AiClientError)) return "invalid_response";
  return error.status ? `${error.code}:${error.status}` : error.code;
}
