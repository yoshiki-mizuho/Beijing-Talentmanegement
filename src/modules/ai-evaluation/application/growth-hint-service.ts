import type { AuthRole, GrowthHintSource } from "@prisma/client";

import * as jobRepository from "@/modules/ai-evaluation/infrastructure/ai-job-repository";
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
  GROWTH_HINT_JSON_SCHEMA_HINT,
} from "@/modules/ai-evaluation/domain/growth-hint-prompt";
import { isGrowthLevelChange } from "@/modules/growth/domain/level-change-source";
import { listSkillMentorCandidates } from "@/modules/growth/application/growth-service";
import { getGrowthHintMemberContext } from "@/modules/members/application/member-service";
import {
  fallbackMemberProfile,
  resolveMemberProfiles,
} from "@/modules/members/application/member-directory";
import {
  getMemberScope,
  memberIsInScope,
} from "@/modules/members/application/member-scope";
import { AuthorizationError } from "@/server/auth/authorization";
import { getTenantId } from "@/server/db/prisma";
import { generatePlatformText } from "@/server/platform/llm";
import {
  AI_JOB_DAILY_LIMIT,
  startOfJstDay,
} from "@/modules/ai-evaluation/domain/ai-job-policy";

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

export type GrowthHintState = {
  hint: GrowthHintView | null;
  jobStatus: "QUEUED" | "RUNNING" | "FAILED" | null;
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
  const scope = await getMemberScope(viewer.role, viewer.memberId);
  const canAddOneOnOneNotes =
    viewer.role === "MANAGER" && memberIsInScope(scope, memberId);
  const { input } = await prepareInput(memberId);
  return {
    input,
    inputHash: hashGrowthHintInput(input),
    canAddOneOnOneNotes
  };
}

async function prepareInput(memberId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 180);
  const context = await getGrowthHintMemberContext(memberId, since);
  if (!context) throw new Error("member_not_found");
  return { input: buildInput(context) };
}

export async function getGrowthHint(
  memberId: string,
  viewer: GrowthHintViewer,
) {
  const [{ inputHash, canAddOneOnOneNotes }, saved, job] = await Promise.all([
    prepare(memberId, viewer),
    hintRepository.findGrowthHint(memberId),
    jobRepository.findLatestGrowthHintJob(memberId),
  ]);
  return {
    hint: saved ? toView(saved, inputHash, canAddOneOnOneNotes) : null,
    jobStatus: job && ["QUEUED", "RUNNING", "FAILED"].includes(job.status)
      ? job.status as GrowthHintState["jobStatus"]
      : null,
  } satisfies GrowthHintState;
}

export async function generateGrowthHint(
  memberId: string,
  viewer: GrowthHintViewer,
) {
  const { input, inputHash, canAddOneOnOneNotes } = await prepare(memberId, viewer);
  const previous = await hintRepository.findGrowthHint(memberId);
  const tenantId = await getTenantId();
  const reservation = await jobRepository.reserveGrowthHintJob({
    tenantId,
    targetMemberId: memberId,
    requestedByMemberId: viewer.memberId,
    dayStartedAt: startOfJstDay(new Date()),
    dailyLimit: AI_JOB_DAILY_LIMIT,
  });
  const displayed = previous ?? await saveGrowthHintContent(
    memberId,
    viewer.memberId,
    input,
    "FALLBACK",
    null,
  );
  if (reservation.kind === "active") {
    return {
      hint: toView(displayed, inputHash, canAddOneOnOneNotes),
      message: "作成を受け付けました。数分後にできます。",
      jobStatus: reservation.job.status as "QUEUED" | "RUNNING",
    };
  }
  if (reservation.kind === "daily_limit") {
    return {
      hint: toView(displayed, inputHash, canAddOneOnOneNotes),
      message: "今日の上限に達したため、簡易版を表示しています。",
      jobStatus: null,
    };
  }
  return {
    hint: toView(displayed, inputHash, canAddOneOnOneNotes),
    message: "作成を受け付けました。数分後にできます。",
    jobStatus: reservation.job.status as "QUEUED",
  };
}

export async function executeGrowthHintJob(input: {
  targetMemberId: string;
  requestedByMemberId: string;
  requestId: string;
}) {
  const context = await prepareInput(input.targetMemberId);
  const messages = buildGrowthHintMessages(limitGrowthHintInput(context.input));
  const startedAt = Date.now();
  const result = await generatePlatformText({
    systemPrompt: messages[0].content,
    userPrompt: messages[1].content,
    jsonSchemaHint: GROWTH_HINT_JSON_SCHEMA_HINT,
    requestId: input.requestId,
  });
  await saveGrowthHintContent(
    input.targetMemberId,
    input.requestedByMemberId,
    context.input,
    "AI",
    result.model,
    result.text,
  );
  return { model: result.model, durationMs: Date.now() - startedAt };
}

export async function saveGrowthHintFallbackForJob(input: {
  targetMemberId: string;
  requestedByMemberId: string;
}) {
  const context = await prepareInput(input.targetMemberId);
  return saveGrowthHintContent(
    input.targetMemberId,
    input.requestedByMemberId,
    context.input,
    "FALLBACK",
    null,
  );
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
      .filter(
        (item): item is typeof item & { toLevel: number } =>
          isGrowthLevelChange(item.source) && item.toLevel !== null
      )
      .map((item) => ({
        skillId: item.skillId,
        name: item.skill.name,
        fromLevel: item.fromLevel,
        toLevel: item.toLevel,
      })),
  };
}

export function limitGrowthHintInput(input: GrowthHintInput) {
  const limited: GrowthHintInput = {
    approvedSkills: input.approvedSkills.slice(0, 20),
    targetRole: input.targetRole
      ? {
          ...input.targetRole,
          requirements: input.targetRole.requirements.slice(0, 20),
        }
      : null,
    skillGaps: input.skillGaps.slice(0, 20),
    recentGrowth: input.recentGrowth.slice(0, 20),
  };
  while (JSON.stringify(limited).length > 2_600) {
    const candidates = [
      limited.recentGrowth,
      limited.approvedSkills,
      limited.skillGaps,
      limited.targetRole?.requirements ?? [],
    ];
    const longest = candidates.sort(
      (left, right) => right.length - left.length,
    )[0];
    if (longest.length === 0) break;
    longest.pop();
  }
  return limited;
}

async function saveGrowthHintContent(
  memberId: string,
  generatedById: string,
  input: GrowthHintInput,
  source: GrowthHintSource,
  model: string | null,
  generatedText?: string,
) {
  const base = await buildComputedContent(memberId, input);
  const written = source === "AI" && generatedText
    ? parseAiGrowthHint(generatedText)
    : createFallbackGrowthHint(input);
  const content = growthHintContentSchema.parse({ ...base, ...written });
  return hintRepository.saveGrowthHint({
    memberId,
    source,
    inputHash: hashGrowthHintInput(input),
    content,
    model,
    generatedById,
  });
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
  const candidateProfiles = await resolveMemberProfiles(
    candidates.map((candidate) => candidate.member.id),
  );
  const candidateName = (id: string) =>
    (candidateProfiles.get(id) ?? fallbackMemberProfile(id)).name;
  const mentor = candidates
    .filter((item) => item.member.id !== memberId)
    .sort(
      (left, right) =>
        right.level - left.level ||
        candidateName(left.member.id).localeCompare(
          candidateName(right.member.id),
          "ja"
        ),
    )[0];
  return {
    strengths,
    skillGaps: input.skillGaps,
    targetRoleName: input.targetRole?.name ?? null,
    mentor:
      mentor && firstGap
        ? {
            memberId: mentor.member.id,
            name: candidateName(mentor.member.id),
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
