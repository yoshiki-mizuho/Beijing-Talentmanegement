import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rows: vi.fn() }));
vi.mock("@/modules/ai-evaluation/infrastructure/ai-job-repository", () => ({
  getAiJobUsageRows: mocks.rows,
}));

import { getAiFeatureName, getAiUsageSummary } from "./ai-usage-service";

describe("getAiFeatureName", () => {
  it("提案用スキルシートの機能名を表示する", () => {
    expect(getAiFeatureName("PROPOSAL_SHEET")).toBe("提案用スキルシート");
  });

  it("日本時間の日の境目で直近30日を集計する", async () => {
    mocks.rows.mockResolvedValue([
      { id: "before", createdAt: new Date("2026-11-21T14:59:59Z"), status: "SUCCEEDED", kind: "GROWTH_HINT", errorCode: null },
      { id: "today", createdAt: new Date("2026-11-21T15:00:00Z"), status: "QUEUED", kind: "PROPOSAL_SHEET", errorCode: null },
    ]);
    const summary = await getAiUsageSummary(new Date("2026-11-22T03:00:00Z"));
    expect(summary.todayCount).toBe(1);
    expect(summary.days.at(-1)).toMatchObject({ QUEUED: 1, PROPOSAL_SHEET: 1 });
    expect(summary.days.at(-2)).toMatchObject({ SUCCEEDED: 1, GROWTH_HINT: 1 });
  });
});
