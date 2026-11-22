import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reserve: vi.fn(), tenantId: vi.fn() }));

vi.mock("@/modules/ai-evaluation/infrastructure/ai-job-repository", () => ({
  reserveAiJob: mocks.reserve,
}));
vi.mock("@/server/db/prisma", () => ({ getTenantId: mocks.tenantId }));

import { reserveSkillPrerequisiteSuggestions } from "./skill-prerequisite-suggestion-service";

describe("reserveSkillPrerequisiteSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantId.mockResolvedValue("11111111-1111-4111-8111-111111111111");
    mocks.reserve.mockResolvedValue({ kind: "created", job: { status: "QUEUED" } });
  });

  it("範囲だけをparamsに入れて予約する", async () => {
    const result = await reserveSkillPrerequisiteSuggestions("unrelated", "admin");
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({
      kind: "SKILL_PREREQUISITE",
      requestedByMemberId: "admin",
      params: { scope: "unrelated" },
      dailyLimit: 50,
    }));
    expect(result.jobStatus).toBe("QUEUED");
  });

  it("当日の上限では予約済みにしない", async () => {
    mocks.reserve.mockResolvedValue({ kind: "daily_limit" });
    await expect(reserveSkillPrerequisiteSuggestions("all", "admin"))
      .resolves.toMatchObject({ jobStatus: null });
  });
});
