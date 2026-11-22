import { randomUUID } from "node:crypto";

import {
  AI_JOB_RUN_LIMIT,
  AI_JOB_STALE_MINUTES,
  decideAiJobFailure,
} from "@/modules/ai-evaluation/domain/ai-job-policy";
import * as jobs from "@/modules/ai-evaluation/infrastructure/ai-job-repository";
import {
  executeGrowthHintJob,
  saveGrowthHintFallbackForJob,
} from "@/modules/ai-evaluation/application/growth-hint-service";
import { runWithTenant } from "@/server/db/prisma";

type ResultCounts = Record<string, number>;

function increment(counts: ResultCounts, code: string) {
  counts[code] = (counts[code] ?? 0) + 1;
}

export async function runAiJobs() {
  const tenants = await jobs.listHubTenantIds();
  const counts: ResultCounts = {};
  let processed = 0;

  for (const tenant of tenants) {
    if (processed >= AI_JOB_RUN_LIMIT) break;
    const skipTenant = await runWithTenant(tenant.id, async () => {
      const now = new Date();
      await jobs.requeueStaleJobs(new Date(
        now.getTime() - AI_JOB_STALE_MINUTES * 60_000,
      ));
      const runnable = await jobs.listRunnableJobs(
        now,
        AI_JOB_RUN_LIMIT - processed,
      );
      for (const queued of runnable) {
        const claimed = await jobs.claimJob(queued.id, new Date());
        if (!claimed) continue;
        processed += 1;
        const startedAt = Date.now();
        try {
          if (
            claimed.kind !== "GROWTH_HINT" ||
            !claimed.targetMemberId
          ) {
            throw new Error("unsupported_ai_job");
          }
          const result = await executeGrowthHintJob({
            targetMemberId: claimed.targetMemberId,
            requestedByMemberId: claimed.requestedByMemberId,
            requestId: randomUUID(),
          });
          await jobs.completeJob({
            id: claimed.id,
            model: result.model,
            durationMs: result.durationMs,
          });
          increment(counts, "SUCCEEDED");
        } catch (error) {
          const decision = decideAiJobFailure(
            error,
            claimed.attempts,
            new Date(),
          );
          increment(counts, decision.errorCode);
          if (decision.action === "retry") {
            const nextRunAt = decision.nextRunAt ?? new Date();
            await jobs.retryJob(claimed.id, nextRunAt, decision.errorCode);
            if (decision.errorCode.includes("daily quota")) {
              await jobs.deferTenantJobs(nextRunAt, decision.errorCode);
              return false;
            }
          } else if (decision.action === "skip_tenant") {
            await jobs.retryJob(claimed.id, new Date(), decision.errorCode);
            return true;
          } else {
            await jobs.failJob(
              claimed.id,
              decision.errorCode,
              Date.now() - startedAt,
            );
            if (claimed.kind === "GROWTH_HINT" && claimed.targetMemberId) {
              await saveGrowthHintFallbackForJob({
                targetMemberId: claimed.targetMemberId,
                requestedByMemberId: claimed.requestedByMemberId,
              });
            }
          }
        }
      }
      return false;
    });
    console.info("AI jobs tenant result", {
      tenantId: tenant.id,
      processed,
      counts,
    });
    if (skipTenant) continue;
  }

  console.info("AI jobs run complete", { processed, counts });
  return { processed, counts };
}
