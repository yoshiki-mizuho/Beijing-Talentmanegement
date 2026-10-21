import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAiConfig: vi.fn(),
  createChatCompletion: vi.fn(),
  findGrowthHint: vi.fn(),
  saveGrowthHint: vi.fn(),
  recordAiUsage: vi.fn(),
  getContext: vi.fn(),
  getScope: vi.fn(),
  mentors: vi.fn(),
  sumAiTokensSince: vi.fn(),
}));

vi.mock(
  "@/modules/ai-evaluation/infrastructure/ai-client",
  async (original) => {
    const actual =
      await original<
        typeof import("@/modules/ai-evaluation/infrastructure/ai-client")
      >();
    return {
      ...actual,
      getAiConfig: mocks.getAiConfig,
      createChatCompletion: mocks.createChatCompletion,
    };
  },
);
vi.mock(
  "@/modules/ai-evaluation/infrastructure/growth-hint-repository",
  () => ({
    findGrowthHint: mocks.findGrowthHint,
    saveGrowthHint: mocks.saveGrowthHint,
  }),
);
vi.mock("@/modules/ai-evaluation/infrastructure/ai-usage-repository", () => ({
  recordAiUsage: mocks.recordAiUsage,
  sumAiTokensSince: mocks.sumAiTokensSince,
}));
vi.mock("@/modules/members/application/member-service", () => ({
  getGrowthHintMemberContext: mocks.getContext,
}));
vi.mock("@/modules/members/application/member-scope", () => ({
  getMemberScope: mocks.getScope,
  memberIsInScope: (scope: { memberIds: string[] }, id: string) =>
    scope.memberIds.includes(id),
}));
vi.mock("@/modules/growth/application/growth-service", () => ({
  listSkillMentorCandidates: mocks.mentors,
}));

import { generateGrowthHint, getGrowthHint } from "./growth-hint-service";

const viewer = { memberId: "manager", role: "MANAGER" as const };
const context = {
  id: "member",
  managerId: "manager",
  memberSkills: [
    {
      skillId: "skill-1",
      level: 4,
      skill: { name: "TypeScript", category: { name: "開発" } },
    },
  ],
  targetRole: {
    name: "リード",
    roleRequirements: [
      { skillId: "skill-2", requiredLevel: 3, skill: { name: "設計" } },
    ],
  },
  skillLevelChanges: [],
};

function stored(source: "AI" | "FALLBACK" = "AI") {
  return {
    id: "hint",
    memberId: "member",
    source,
    inputHash: "hash",
    content: {
      strengthsSummary: "強みです",
      nextSteps: ["次の一歩"],
      oneOnOneTopics: ["話題"],
      strengths: [{ skillId: "skill-1", name: "TypeScript", level: 4 }],
      skillGaps: [
        { skillId: "skill-2", name: "設計", currentLevel: 0, requiredLevel: 3 },
      ],
      targetRoleName: "リード",
      mentor: null,
    },
    model: source === "AI" ? "fake" : null,
    generatedById: "manager",
    generatedAt: new Date("2026-10-18T00:00:00Z"),
    updatedAt: new Date("2026-10-18T00:00:00Z"),
  };
}

describe("generateGrowthHint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue(context);
    mocks.getScope.mockResolvedValue({ memberIds: ["member"] });
    mocks.mentors.mockResolvedValue([]);
    mocks.findGrowthHint.mockResolvedValue(null);
    mocks.sumAiTokensSince.mockResolvedValue(0);
    vi.stubEnv("AI_MONTHLY_TOKEN_LIMIT", "");
    mocks.saveGrowthHint.mockImplementation(async (value) => ({
      ...stored(value.source),
      inputHash: value.inputHash,
      content: value.content,
    }));
  });

  it("上限未満ならAIを呼ぶ", async () => {
    vi.stubEnv("AI_MONTHLY_TOKEN_LIMIT", "10");
    mocks.sumAiTokensSince.mockResolvedValue(9);
    mocks.getAiConfig.mockReturnValue({ kind: "fake" });
    mocks.createChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        strengthsSummary: "強みです",
        nextSteps: ["次へ"],
        oneOnOneTopics: ["話題"],
      }),
      model: "fake",
      usage: { totalTokens: 3 },
      latencyMs: 4,
    });
    await generateGrowthHint("member", viewer);
    expect(mocks.createChatCompletion).toHaveBeenCalledOnce();
  });

  it("上限以上ならAIを呼ばず簡易版を保存する", async () => {
    vi.stubEnv("AI_MONTHLY_TOKEN_LIMIT", "10");
    mocks.sumAiTokensSince.mockResolvedValue(10);
    mocks.getAiConfig.mockReturnValue({ kind: "fake" });
    const result = await generateGrowthHint("member", viewer);
    expect(mocks.createChatCompletion).not.toHaveBeenCalled();
    expect(result.message).toContain("利用上限");
    expect(mocks.recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FALLBACK",
        errorCode: "monthly_limit",
      }),
    );
  });

  it("AI未設定なら簡易版を保存してFALLBACKを記録する", async () => {
    mocks.getAiConfig.mockReturnValue({ kind: "none" });
    const result = await generateGrowthHint("member", viewer);
    expect(result.hint.source).toBe("FALLBACK");
    expect(mocks.recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FALLBACK",
        errorCode: "not_configured",
      }),
    );
  });

  it("成功ならAI版とSUCCESSを記録する", async () => {
    mocks.getAiConfig.mockReturnValue({ kind: "fake" });
    mocks.createChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        strengthsSummary: "強みです",
        nextSteps: ["次へ"],
        oneOnOneTopics: ["話題"],
      }),
      model: "fake",
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      latencyMs: 4,
    });
    const result = await generateGrowthHint("member", viewer);
    expect(result.hint.source).toBe("AI");
    expect(mocks.recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SUCCESS", totalTokens: 3 }),
    );
  });

  it("失敗時に前回があれば上書きしない", async () => {
    mocks.getAiConfig.mockReturnValue({ kind: "fake" });
    mocks.findGrowthHint.mockResolvedValue(stored());
    mocks.createChatCompletion.mockRejectedValue(new Error("failure"));
    const result = await generateGrowthHint("member", viewer);
    expect(result.keptPrevious).toBe(true);
    expect(mocks.saveGrowthHint).not.toHaveBeenCalled();
    expect(mocks.recordAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({ status: "FAILED" }),
    );
  });

  it("失敗時に前回がなければ簡易版を保存する", async () => {
    mocks.getAiConfig.mockReturnValue({ kind: "fake" });
    mocks.createChatCompletion.mockRejectedValue(new Error("failure"));
    const result = await generateGrowthHint("member", viewer);
    expect(result.hint.source).toBe("FALLBACK");
    expect(mocks.saveGrowthHint).toHaveBeenCalledWith(
      expect.objectContaining({ source: "FALLBACK" }),
    );
  });

  it("権限外なら403にする", async () => {
    mocks.getScope.mockResolvedValue({ memberIds: [] });
    await expect(generateGrowthHint("member", viewer)).rejects.toMatchObject({
      status: 403,
    });
  });

  it.each([
    [
      "取得",
      () => getGrowthHint("member", { memberId: "member", role: "MEMBER" }),
    ],
    [
      "作成",
      () => generateGrowthHint("member", { memberId: "member", role: "MEMBER" }),
    ],
  ])("MEMBERは育成のヒントを%sできない", async (_label, action) => {
    await expect(action()).rejects.toMatchObject({ status: 403 });
  });

  it.each([
    ["取得", () => getGrowthHint("member", viewer)],
    ["作成", () => generateGrowthHint("member", viewer)],
  ])(
    "担当範囲外のMANAGERは育成のヒントを%sできない",
    async (_label, action) => {
      mocks.getScope.mockResolvedValue({ memberIds: [] });
      await expect(action()).rejects.toMatchObject({ status: 403 });
    },
  );

  it.each([
    [
      "取得",
      () => getGrowthHint("member", { memberId: "admin", role: "ADMIN" }),
    ],
    [
      "作成",
      () => generateGrowthHint("member", { memberId: "admin", role: "ADMIN" }),
    ],
  ])("ADMINは誰の育成のヒントでも%sできる", async (_label, action) => {
    mocks.getAiConfig.mockReturnValue({ kind: "none" });
    await action();
    expect(mocks.getScope).not.toHaveBeenCalled();
  });
});
