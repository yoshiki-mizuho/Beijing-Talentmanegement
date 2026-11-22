import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findGrowthHint: vi.fn(),
  saveGrowthHint: vi.fn(),
  findLatestJob: vi.fn(),
  reserveJob: vi.fn(),
  getContext: vi.fn(),
  getScope: vi.fn(),
  mentors: vi.fn(),
  resolveMemberProfiles: vi.fn(),
  getTenantId: vi.fn(),
  generatePlatformText: vi.fn(),
}));

vi.mock("@/modules/ai-evaluation/infrastructure/growth-hint-repository", () => ({
  findGrowthHint: mocks.findGrowthHint,
  saveGrowthHint: mocks.saveGrowthHint,
}));
vi.mock("@/modules/ai-evaluation/infrastructure/ai-job-repository", () => ({
  findLatestGrowthHintJob: mocks.findLatestJob,
  reserveGrowthHintJob: mocks.reserveJob,
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
vi.mock("@/modules/members/application/member-directory", () => ({
  resolveMemberProfiles: mocks.resolveMemberProfiles,
  fallbackMemberProfile: (memberId: string) => ({ memberId, name: "（名前未設定）" }),
}));
vi.mock("@/server/db/prisma", () => ({ getTenantId: mocks.getTenantId }));
vi.mock("@/server/platform/llm", () => ({
  generatePlatformText: mocks.generatePlatformText,
}));

import {
  generateGrowthHint,
  getGrowthHint,
  executeGrowthHintJob,
  limitGrowthHintInput,
} from "./growth-hint-service";

const viewer = { memberId: "manager", role: "MANAGER" as const };
const context = {
  id: "member",
  memberSkills: [{
    skillId: "skill-1",
    level: 4,
    skill: { name: "TypeScript", category: { name: "開発" } },
  }],
  targetRole: null,
  skillLevelChanges: [],
};

describe("growth hint reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue(context);
    mocks.getScope.mockResolvedValue({ memberIds: ["member"] });
    mocks.findGrowthHint.mockResolvedValue(null);
    mocks.findLatestJob.mockResolvedValue(null);
    mocks.getTenantId.mockResolvedValue("11111111-1111-4111-8111-111111111111");
    mocks.reserveJob.mockResolvedValue({
      kind: "created",
      job: { id: "job", status: "QUEUED" },
    });
    mocks.saveGrowthHint.mockImplementation(async (input) => ({
      ...input,
      id: "hint",
      generatedAt: new Date(),
      updatedAt: new Date(),
    }));
    mocks.mentors.mockResolvedValue([]);
    mocks.resolveMemberProfiles.mockResolvedValue(new Map());
    mocks.generatePlatformText.mockResolvedValue({
      text: JSON.stringify({
        strengthsSummary: "強みです",
        nextSteps: ["次の一歩"],
        oneOnOneTopics: ["話題"],
      }),
      model: "internal",
    });
  });

  it("同じ対象に実行中の予約があれば重複して作らない", async () => {
    mocks.reserveJob.mockResolvedValue({
      kind: "active",
      job: { id: "existing", status: "RUNNING" },
    });
    const result = await generateGrowthHint("member", viewer);
    expect(result.jobStatus).toBe("RUNNING");
    expect(mocks.reserveJob).toHaveBeenCalledOnce();
  });

  it("当日50件未満ならテナントを記録して予約する", async () => {
    const result = await generateGrowthHint("member", viewer);
    expect(result.jobStatus).toBe("QUEUED");
    expect(mocks.reserveJob).toHaveBeenCalledWith({
      tenantId: "11111111-1111-4111-8111-111111111111",
      targetMemberId: "member",
      requestedByMemberId: "manager",
      dayStartedAt: expect.any(Date),
      dailyLimit: 50,
    });
  });

  it("当日50件なら予約せず簡易版を保存する", async () => {
    mocks.reserveJob.mockResolvedValue({ kind: "daily_limit" });
    const result = await generateGrowthHint("member", viewer);
    expect(result.jobStatus).toBeNull();
    expect(result.hint?.source).toBe("FALLBACK");
    expect(mocks.reserveJob).toHaveBeenCalledOnce();
  });

  it("最新の予約状態をヒントと一緒に返す", async () => {
    mocks.findLatestJob.mockResolvedValue({ status: "QUEUED" });
    await expect(getGrowthHint("member", viewer)).resolves.toEqual({
      hint: null,
      jobStatus: "QUEUED",
    });
  });

  it("権限外のMANAGERは予約できない", async () => {
    mocks.getScope.mockResolvedValue({ memberIds: [] });
    await expect(generateGrowthHint("member", viewer)).rejects.toMatchObject({ status: 403 });
  });

  it("MEMBERは育成のヒントを取得も予約もできない", async () => {
    const memberViewer = { memberId: "member", role: "MEMBER" as const };
    await expect(getGrowthHint("member", memberViewer))
      .rejects.toMatchObject({ status: 403 });
    await expect(generateGrowthHint("member", memberViewer))
      .rejects.toMatchObject({ status: 403 });
  });

  it("ADMINは担当範囲によらず予約できる", async () => {
    mocks.getScope.mockResolvedValue({ memberIds: [] });
    await expect(generateGrowthHint("member", {
      memberId: "admin",
      role: "ADMIN",
    })).resolves.toMatchObject({ jobStatus: "QUEUED" });
  });

  it("定期実行では基盤LLMの結果をAI版として保存する", async () => {
    const result = await executeGrowthHintJob({
      targetMemberId: "member",
      requestedByMemberId: "manager",
      requestId: "request-id",
    });
    expect(mocks.generatePlatformText).toHaveBeenCalledWith({
      systemPrompt: expect.any(String),
      userPrompt: expect.any(String),
      jsonSchemaHint: expect.stringContaining("strengthsSummary"),
      requestId: "request-id",
    });
    expect(mocks.saveGrowthHint).toHaveBeenCalledWith(expect.objectContaining({
      source: "AI",
      model: "internal",
      generatedById: "manager",
    }));
    expect(result.model).toBe("internal");
  });

  it("LLMへ渡す入力を推奨文字数内へ絞る", () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      skillId: `skill-${index}`,
      name: "長いスキル名".repeat(20),
      category: "開発",
      level: 3,
    }));
    const limited = limitGrowthHintInput({
      approvedSkills: items,
      targetRole: null,
      skillGaps: [],
      recentGrowth: [],
    });
    expect(JSON.stringify(limited).length).toBeLessThanOrEqual(2_600);
  });
});
