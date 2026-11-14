import {
  buildProposalSheetMessages,
  createFakeProposalSheetResponse,
  createFallbackProposalSheet,
  parseProposalSheetResponse,
  type ProposalSheetPromptInput,
  type ProposalSheetText
} from "../domain/proposal-sheet";
import {
  AiClientError,
  createChatCompletion,
  getAiConfig
} from "../infrastructure/ai-client";
import * as usageRepository from "../infrastructure/ai-usage-repository";
import { getAiMonthlyTokenLimit } from "../domain/ai-usage-summary";

const RESERVED_TOKENS = 6_000;

export type ProposalSheetGeneration = {
  source: "AI" | "FALLBACK";
  content: ProposalSheetText;
  model: string | null;
  message: string | null;
  keptPrevious: boolean;
};

export async function generateProposalSheetText(
  actorMemberId: string,
  targetMemberId: string,
  input: ProposalSheetPromptInput,
  previous?: ProposalSheetText
): Promise<ProposalSheetGeneration> {
  const startedAt = Date.now();
  const config = getAiConfig();
  if (config.kind === "none") {
    await record("FALLBACK", "not_configured");
    return fallback("AI が未設定のため、簡易版で作りました。");
  }
  const reservation = await usageRepository.reserveAiUsage({
    feature: "proposal_sheet",
    actorMemberId,
    targetMemberId,
    reservedTokens: RESERVED_TOKENS,
    monthlyTokenLimit: getAiMonthlyTokenLimit()
  });
  if (reservation.kind === "monthly_limit") {
    await record("FALLBACK", "monthly_limit");
    return fallback("今月の AI の利用上限に達したため、簡易版で作りました。");
  }
  if (reservation.kind === "rate_limited_user") {
    await record("FAILED", "rate_limited_user");
    return failedPrevious("短い時間に何度も作り直したため、少し待ってからもう一度お試しください。");
  }
  try {
    const result = await createChatCompletion({
      messages: buildProposalSheetMessages(input),
      fakeResponse: () => createFakeProposalSheetResponse(input)
    });
    const content = parseProposalSheetResponse(result.content, input);
    await usageRepository.completeAiUsageReservation(reservation.id, {
      model: result.model,
      status: "SUCCESS",
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      totalTokens: result.usage?.totalTokens,
      latencyMs: result.latencyMs
    });
    return { source: "AI", content, model: result.model, message: null, keptPrevious: false };
  } catch (error) {
    const errorCode = getErrorCode(error);
    await usageRepository.completeAiUsageReservation(reservation.id, {
      status: "FAILED",
      latencyMs: Date.now() - startedAt,
      errorCode
    });
    return failedPrevious("作り直しに失敗しました。前回の下書きを表示しています。");
  }

  function fallback(message: string): ProposalSheetGeneration {
    return {
      source: "FALLBACK",
      content: createFallbackProposalSheet(input),
      model: null,
      message,
      keptPrevious: false
    };
  }
  function failedPrevious(message: string): ProposalSheetGeneration {
    if (previous) return { source: "AI", content: previous, model: null, message, keptPrevious: true };
    return fallback(message.replace("前回の下書きを表示しています。", "簡易版で作りました。"));
  }
  function record(status: "FAILED" | "FALLBACK", errorCode: string) {
    return usageRepository.recordAiUsage({
      feature: "proposal_sheet",
      actorMemberId,
      targetMemberId,
      status,
      latencyMs: Date.now() - startedAt,
      errorCode
    });
  }
}

function getErrorCode(error: unknown) {
  if (!(error instanceof AiClientError)) return "invalid_response";
  return error.status === undefined ? error.code : `${error.code}:${error.status}`;
}
