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
  executeProposal: vi.fn(),
  executePrerequisite: vi.fn(),
  buildProposalInput: vi.fn(),
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
vi.mock("@/modules/ai-evaluation/application/proposal-sheet-service", () => ({
  executeProposalSheetJob: mocks.executeProposal,
}));
vi.mock("@/modules/ai-evaluation/application/skill-prerequisite-suggestion-service", () => ({
  executeSkillPrerequisiteJob: mocks.executePrerequisite,
}));
vi.mock("@/modules/proposal-sheet/application/proposal-sheet-service", () => ({
  buildProposalSheetJobInput: mocks.buildProposalInput,
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
    mocks.executeProposal.mockResolvedValue({ model: "internal", durationMs: 10, result: { content: {}, inputHash: "hash" } });
    mocks.executePrerequisite.mockResolvedValue({ model: "internal", durationMs: 10, result: { suggestions: [] } });
    mocks.buildProposalInput.mockResolvedValue({ projects: [] });
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
      result: undefined,
    });
    expect(result.processed).toBe(1);
  });

  it("提案用スキルシートの結果をAiJobへ保存する", async () => {
    mocks.claim.mockResolvedValue({
      id: "job", kind: "PROPOSAL_SHEET", targetMemberId: "member",
      requestedByMemberId: "manager", attempts: 1, params: {},
    });
    await runAiJobs();
    expect(mocks.executeProposal).toHaveBeenCalledWith({ projects: [] });
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({
      result: { content: {}, inputHash: "hash" },
    }));
  });

  it("前提スキルの範囲をparamsから定期実行へ渡す", async () => {
    mocks.claim.mockResolvedValue({
      id: "job", kind: "SKILL_PREREQUISITE", targetMemberId: null,
      requestedByMemberId: "admin", attempts: 1, params: { scope: "all" },
    });
    await runAiJobs();
    expect(mocks.executePrerequisite).toHaveBeenCalledWith("all");
  });
});
