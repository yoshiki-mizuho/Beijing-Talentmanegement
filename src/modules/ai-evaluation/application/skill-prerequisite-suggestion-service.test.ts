import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  getAiConfig: vi.fn(),
  createChatCompletion: vi.fn(),
  reserve: vi.fn(),
  complete: vi.fn(),
  record: vi.fn(),
}));

vi.mock("@/modules/skills/application/skill-service", () => ({
  getSkillPrerequisiteSuggestionContext: mocks.getContext,
}));
vi.mock("@/modules/ai-evaluation/infrastructure/ai-client", () => ({
  getAiConfig: mocks.getAiConfig,
  createChatCompletion: mocks.createChatCompletion,
  AiClientError: class AiClientError extends Error {},
}));
vi.mock("@/modules/ai-evaluation/infrastructure/ai-usage-repository", () => ({
  reserveAiUsage: mocks.reserve,
  completeAiUsageReservation: mocks.complete,
  recordAiUsage: mocks.record,
}));

import { generateSkillPrerequisiteSuggestions } from "./skill-prerequisite-suggestion-service";

describe("前提スキルのAI候補", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_MONTHLY_TOKEN_LIMIT", "");
    mocks.getContext.mockResolvedValue({ skills: [], prerequisites: [] });
    mocks.getAiConfig.mockReturnValue({ kind: "fake" });
    mocks.reserve.mockResolvedValue({ kind: "reserved", id: "usage" });
    mocks.createChatCompletion.mockResolvedValue({
      content: '{"suggestions":[]}',
      model: "fake",
      usage: undefined,
      latencyMs: 5,
    });
  });

  it("予約してからAIを呼び、usageなしでも予約行を更新する", async () => {
    await generateSkillPrerequisiteSuggestions("all", "admin-1");
    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ reservedTokens: 16_000 }),
    );
    expect(mocks.complete).toHaveBeenCalledWith(
      "usage",
      expect.objectContaining({ status: "SUCCESS", totalTokens: undefined }),
    );
  });

  it("回数制限ではAIを呼ばず失敗を記録する", async () => {
    mocks.reserve.mockResolvedValue({ kind: "rate_limited_user" });
    const result = await generateSkillPrerequisiteSuggestions("all", "admin-1");
    expect(result.message).toContain("少し待って");
    expect(mocks.createChatCompletion).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "rate_limited_user" }),
    );
  });
});
