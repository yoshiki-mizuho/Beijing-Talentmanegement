import type { AuthRole, GrowthHintSource } from "@prisma/client";

import {
  createChatCompletion,
  getAiConfig,
  AiClientError,
} from "@/modules/ai-evaluation/infrastructure/ai-client";
import * as usageRepository from "@/modules/ai-evaluation/infrastructure/ai-usage-repository";
import * as hintRepository from "@/modules/ai-evaluation/infrastructure/growth-hint-repository";
import {
  growthHintContentSchema,
  parseAiGrowthHint,
  type GrowthHintContent,
} from "@/modules/ai-evaluation/domain/growth-hint";
import { createFallbackGrowthHint } from "@/modules/ai-evaluation/domain/growth-hint-fallback";
import {
  hashGrowthHintInput,
  type GrowthHintInput,
} from "@/modules/ai-evaluation/domain/growth-hint-input";
import {
  buildGrowthHintMessages,
  createFakeGrowthHintResponse,
} from "@/modules/ai-evaluation/domain/growth-hint-prompt";
import { isGrowthLevelChange } from "@/modules/growth/domain/level-change-source";
import { listSkillMentorCandidates } from "@/modules/growth/application/growth-service";
import { getGrowthHintMemberContext } from "@/modules/members/application/member-service";
import {
  getMemberScope,
  memberIsInScope,
} from "@/modules/members/application/member-scope";
import { AuthorizationError } from "@/server/auth/authorization";
import {
  getAiMonthlyTokenLimit,
} from "@/modules/ai-evaluation/domain/ai-usage-summary";

// 通常の入力と出力を十分に含み、usage 欠落時にも過少計上しない予約量。
const RESERVED_TOKENS = 4_000;

export type GrowthHintViewer = { memberId: string; role: AuthRole };

type StoredHint = Awaited<ReturnType<typeof hintRepository.findGrowthHint>>;
type Context = NonNullable<
  Awaited<ReturnType<typeof getGrowthHintMemberContext>>
>;

export type GrowthHintView = {
  source: GrowthHintSource;
  content: GrowthHintContent;
  generatedAt: string;
  isStale: boolean;
  canAddOneOnOneNotes: boolean;
};

export async function assertGrowthHintAccess(
  memberId: string,
  viewer: GrowthHintViewer,
) {
  if (viewer.role === "ADMIN") return;
  if (viewer.role !== "MANAGER") {
    throw new AuthorizationError("育成のヒントを見る権限がありません。", 403);
  }
  const scope = await getMemberScope(viewer.role, viewer.memberId);
  if (!memberIsInScope(scope, memberId)) {
    throw new AuthorizationError("育成のヒントを見る権限がありません。", 403);
  }
}

async function prepare(memberId: string, viewer: GrowthHintViewer) {
  await assertGrowthHintAccess(memberId, viewer);
  const since = new Date();
  since.setDate(since.getDate() - 180);
  const context = await getGrowthHintMemberContext(memberId, since);
  if (!context) throw new Error("member_not_found");
  const input = buildInput(context);
  return { context, input, inputHash: hashGrowthHintInput(input) };
}

export async function getGrowthHint(
  memberId: string,
  viewer: GrowthHintViewer,
) {
  const [{ context, inputHash }, saved] = await Promise.all([
    prepare(memberId, viewer),
    hintRepository.findGrowthHint(memberId),
  ]);
  return saved
    ? toView(saved, inputHash, context.managerId === viewer.memberId)
    : null;
}

export async function generateGrowthHint(
  memberId: string,
  viewer: GrowthHintViewer,
) {
  const startedAt = Date.now();
  const { context, input, inputHash } = await prepare(memberId, viewer);
  const previous = await hintRepository.findGrowthHint(memberId);
  const base = await buildComputedContent(memberId, input);
  const config = getAiConfig();
  if (config.kind === "none") {
    const saved = await saveContent(
      "FALLBACK",
      createFallbackGrowthHint(input),
      null,
    );
    await log("FALLBACK", Date.now() - startedAt, "not_configured");
    return {
      hint: toView(saved, inputHash, context.managerId === viewer.memberId),
      keptPrevious: false,
      message: null,
    };
  }

  const reservation = await usageRepository.reserveAiUsage({
    feature: "growth_hint",
    actorMemberId: viewer.memberId,
    targetMemberId: memberId,
    reservedTokens: RESERVED_TOKENS,
    monthlyTokenLimit: getAiMonthlyTokenLimit(),
  });
  if (reservation.kind === "monthly_limit") {
    const saved = await saveContent(
      "FALLBACK",
      createFallbackGrowthHint(input),
      null,
    );
    await log("FALLBACK", Date.now() - startedAt, "monthly_limit");
    return {
      hint: toView(saved, inputHash, context.managerId === viewer.memberId),
      keptPrevious: false,
      message: "今月の AI の利用上限に達したため、簡易版で作りました。",
    };
  }
  if (reservation.kind === "rate_limited_user") {
    await log("FAILED", Date.now() - startedAt, "rate_limited_user");
    const message = "短い時間に何度も作り直したため、少し待ってからもう一度お試しください。";
    if (previous) {
      return {
        hint: toView(previous, inputHash, context.managerId === viewer.memberId),
        keptPrevious: true,
        message,
      };
    }
    const saved = await saveContent(
      "FALLBACK",
      createFallbackGrowthHint(input),
      null,
    );
    return {
      hint: toView(saved, inputHash, context.managerId === viewer.memberId),
      keptPrevious: false,
      message,
    };
  }

  try {
    const result = await createChatCompletion({
      messages: buildGrowthHintMessages(input),
      fakeResponse: () => createFakeGrowthHintResponse(input),
    });
    const saved = await saveContent(
      "AI",
      parseAiGrowthHint(result.content),
      result.model,
    );
    await usageRepository.completeAiUsageReservation(reservation.id, {
      model: result.model,
      status: "SUCCESS",
      promptTokens: result.usage?.promptTokens,
      completionTokens: result.usage?.completionTokens,
      totalTokens: result.usage?.totalTokens,
      latencyMs: result.latencyMs,
    });
    return {
      hint: toView(saved, inputHash, context.managerId === viewer.memberId),
      keptPrevious: false,
      message: null,
    };
  } catch (error) {
    const errorCode = getErrorCode(error);
    await usageRepository.completeAiUsageReservation(reservation.id, {
      status: "FAILED",
      latencyMs: Date.now() - startedAt,
      errorCode,
    });
    if (previous) {
      return {
        hint: toView(
          previous,
          inputHash,
          context.managerId === viewer.memberId,
        ),
        keptPrevious: true,
        message: "作り直しに失敗しました。前回のヒントを表示しています。",
      };
    }
    const saved = await saveContent(
      "FALLBACK",
      createFallbackGrowthHint(input),
      null,
    );
    return {
      hint: toView(saved, inputHash, context.managerId === viewer.memberId),
      keptPrevious: false,
      message: getFallbackMessage(errorCode),
    };
  }

  async function saveContent(
    source: GrowthHintSource,
    written: ReturnType<typeof createFallbackGrowthHint>,
    model: string | null,
  ) {
    const content = growthHintContentSchema.parse({ ...base, ...written });
    return hintRepository.saveGrowthHint({
      memberId,
      source,
      inputHash,
      content,
      model,
      generatedById: viewer.memberId,
    });
  }

  function log(
    status: "FAILED" | "FALLBACK",
    latencyMs: number,
    errorCode: string,
  ) {
    return usageRepository.recordAiUsage({
      feature: "growth_hint",
      actorMemberId: viewer.memberId,
      targetMemberId: memberId,
      status,
      latencyMs,
      errorCode,
    });
  }
}

function getErrorCode(error: unknown) {
  if (!(error instanceof AiClientError)) return "invalid_response";
  if (
    error.status !== undefined &&
    (error.code === "http_error" || error.code === "rate_limited")
  ) {
    return `${error.code}:${error.status}`;
  }
  return error.code;
}

function getFallbackMessage(errorCode: string) {
  const reason = errorCode.split(":", 1)[0];
  if (["timeout", "rate_limited", "http_error", "network"].includes(reason)) {
    return "AI が混み合っていたため、簡易版で作りました。時間をおいて作り直してください。";
  }
  if (reason === "invalid_response") {
    return "AI の応答を読み取れなかったため、簡易版で作りました。";
  }
  return "AI で作れなかったため、簡易版で作りました。";
}

function buildInput(context: Context): GrowthHintInput {
  const levels = new Map(
    context.memberSkills.map((item) => [item.skillId, item.level]),
  );
  const requirements = context.targetRole?.roleRequirements ?? [];
  return {
    approvedSkills: context.memberSkills.map((item) => ({
      skillId: item.skillId,
      name: item.skill.name,
      category: item.skill.category.name,
      level: item.level,
    })),
    targetRole: context.targetRole
      ? {
          name: context.targetRole.name,
          requirements: requirements.map((item) => ({
            skillId: item.skillId,
            name: item.skill.name,
            requiredLevel: item.requiredLevel,
          })),
        }
      : null,
    skillGaps: requirements.flatMap((item) => {
      const currentLevel = levels.get(item.skillId) ?? 0;
      return currentLevel < item.requiredLevel
        ? [
            {
              skillId: item.skillId,
              name: item.skill.name,
              currentLevel,
              requiredLevel: item.requiredLevel,
            },
          ]
        : [];
    }),
    recentGrowth: context.skillLevelChanges
      .filter((item) => isGrowthLevelChange(item.source))
      .map((item) => ({
        skillId: item.skillId,
        name: item.skill.name,
        fromLevel: item.fromLevel,
        toLevel: item.toLevel,
      })),
  };
}

async function buildComputedContent(memberId: string, input: GrowthHintInput) {
  const sorted = [...input.approvedSkills].sort(
    (left, right) =>
      right.level - left.level || left.name.localeCompare(right.name, "ja"),
  );
  const strong = sorted.filter((item) => item.level >= 4);
  const strengths = (strong.length > 0 ? strong : sorted.slice(0, 3)).map(
    (item) => ({
      skillId: item.skillId,
      name: item.name,
      level: item.level,
    }),
  );
  const firstGap = input.skillGaps[0];
  const candidates = firstGap
    ? await listSkillMentorCandidates([firstGap.skillId])
    : [];
  const mentor = candidates
    .filter((item) => item.member.id !== memberId)
    .sort(
      (left, right) =>
        right.level - left.level ||
        left.member.name.localeCompare(right.member.name, "ja"),
    )[0];
  return {
    strengths,
    skillGaps: input.skillGaps,
    targetRoleName: input.targetRole?.name ?? null,
    mentor:
      mentor && firstGap
        ? {
            memberId: mentor.member.id,
            name: mentor.member.name,
            skillName: firstGap.name,
          }
        : null,
  };
}

function toView(
  saved: NonNullable<StoredHint>,
  inputHash: string,
  canAddOneOnOneNotes: boolean,
): GrowthHintView {
  return {
    source: saved.source,
    content: growthHintContentSchema.parse(saved.content),
    generatedAt: saved.generatedAt.toISOString(),
    isStale: saved.inputHash !== inputHash,
    canAddOneOnOneNotes,
  };
}
