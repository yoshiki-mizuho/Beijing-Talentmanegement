import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listTenants: vi.fn(),
  requeueStale: vi.fn(),
  listRunnable: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  retry: vi.fn(),
  fail: vi.fn(),
  defer: vi.fn(),
  execute: vi.fn(),
  fallback: vi.fn(),
}));

vi.mock("@/modules/ai-evaluation/infrastructure/ai-job-repository", () => ({
  listHubTenantIds: mocks.listTenants,
  requeueStaleJobs: mocks.requeueStale,
  listRunnableJobs: mocks.listRunnable,
  claimJob: mocks.claim,
  completeJob: mocks.complete,
  retryJob: mocks.retry,
  failJob: mocks.fail,
  deferTenantJobs: mocks.defer,
}));
vi.mock("@/modules/ai-evaluation/application/growth-hint-service", () => ({
  executeGrowthHintJob: mocks.execute,
  saveGrowthHintFallbackForJob: mocks.fallback,
}));
vi.mock("@/server/db/prisma", () => ({
  runWithTenant: (_tenantId: string, fn: () => unknown) => fn(),
}));

import { runAiJobs } from "./ai-job-runner";

describe("runAiJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listTenants.mockResolvedValue([{ id: "tenant" }]);
    mocks.requeueStale.mockResolvedValue({ count: 0 });
    mocks.listRunnable.mockResolvedValue([{ id: "job" }]);
    mocks.claim.mockResolvedValue({
      id: "job",
      kind: "GROWTH_HINT",
      targetMemberId: "member",
      requestedByMemberId: "manager",
      attempts: 1,
    });
    mocks.execute.mockResolvedValue({ model: "internal", durationMs: 10 });
  });

  it("1件を条件付きで取得してLLMの結果を完了として保存する", async () => {
    const result = await runAiJobs();
    expect(mocks.claim).toHaveBeenCalledWith("job", expect.any(Date));
    expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({
      targetMemberId: "member",
      requestedByMemberId: "manager",
    }));
    expect(mocks.complete).toHaveBeenCalledWith({
      id: "job",
      model: "internal",
      durationMs: 10,
    });
    expect(result.processed).toBe(1);
  });
});
