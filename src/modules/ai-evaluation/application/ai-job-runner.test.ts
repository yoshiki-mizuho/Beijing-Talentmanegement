import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listTenants: vi.fn(),
  requeueStale: vi.fn(),
  countRunning: vi.fn(),
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
  countRunningJobs: mocks.countRunning,
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
    mocks.countRunning.mockResolvedValue(0);
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
    const result = await runAiJobs(new Date("2026-11-23T00:00:00.000Z"));
    expect(mocks.listRunnable).toHaveBeenCalledWith(
      new Date("2026-11-23T00:00:00.000Z"),
      1,
    );
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
    await runAiJobs(new Date("2026-11-23T00:00:00.000Z"));
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
    await runAiJobs(new Date("2026-11-23T00:00:00.000Z"));
    expect(mocks.executePrerequisite).toHaveBeenCalledWith("all");
  });

  it("断られる時間帯はDBに触れずに終了する", async () => {
    const result = await runAiJobs(new Date("2026-11-22T17:00:00.000Z"));
    expect(mocks.listTenants).not.toHaveBeenCalled();
    expect(result).toEqual({
      processed: 0,
      counts: {},
      skipped: "batch window",
    });
  });

  it("処理中の依頼があれば新しいジョブを取り出さない", async () => {
    mocks.countRunning.mockResolvedValue(1);
    const result = await runAiJobs(new Date("2026-11-23T00:00:00.000Z"));
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, counts: {}, skipped: "running" });
  });
});
