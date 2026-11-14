import { describe, expect, it } from "vitest";
import { getAiFeatureName } from "./ai-usage-service";

describe("getAiFeatureName", () => {
  it("提案用スキルシートの機能名を表示する", () => {
    expect(getAiFeatureName("proposal_sheet")).toBe("提案用スキルシート");
  });
});
