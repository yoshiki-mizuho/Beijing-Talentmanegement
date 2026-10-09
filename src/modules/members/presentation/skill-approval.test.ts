import { describe, expect, it } from "vitest";

import {
  getSkillApprovalLevelChange,
  getSkillApprovalWaitingDays,
  isSkillApprovalLongWaiting
} from "@/modules/members/presentation/skill-approval";

describe("skill approval display logic", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");

  it("calculates completed waiting days without returning a negative value", () => {
    expect(
      getSkillApprovalWaitingDays("2026-10-05T11:59:59.000Z", now)
    ).toBe(5);
    expect(
      getSkillApprovalWaitingDays("2026-10-06T12:00:01.000Z", now)
    ).toBe(3);
    expect(
      getSkillApprovalWaitingDays("2026-10-11T12:00:00.000Z", now)
    ).toBe(0);
  });

  it("highlights applications waiting for at least five days", () => {
    expect(isSkillApprovalLongWaiting(4)).toBe(false);
    expect(isSkillApprovalLongWaiting(5)).toBe(true);
  });

  it("describes owned and unowned level changes", () => {
    expect(getSkillApprovalLevelChange(2, 4)).toBe(
      "現在 Lv2 → 申告 Lv4"
    );
    expect(getSkillApprovalLevelChange(null, 3)).toBe("未保有 → Lv3");
  });
});
