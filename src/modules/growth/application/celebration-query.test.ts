import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPendingRoleAchievementCelebration: vi.fn(),
  getMemberGrowthData: vi.fn(),
  getBadgeCalculationData: vi.fn(),
  listMemberRoleAchievements: vi.fn(),
  findMember: vi.fn(),
  hasMonthlyRecapVoices: vi.fn()
}));

vi.mock("@/modules/growth/infrastructure/member-growth-repository", () => ({
  getMemberGrowthData: mocks.getMemberGrowthData,
  hasMonthlyRecapVoices: mocks.hasMonthlyRecapVoices
}));

vi.mock("@/modules/growth/infrastructure/badge-calculation-repository", () => ({
  getBadgeCalculationData: mocks.getBadgeCalculationData
}));

vi.mock("@/modules/roles/application/role-achievement-service", () => ({
  getPendingRoleAchievementCelebration: mocks.getPendingRoleAchievementCelebration,
  listMemberRoleAchievements: mocks.listMemberRoleAchievements
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    member: {
      findUnique: mocks.findMember
    }
  }
}));

import { getRoleAchievementCelebration } from "@/modules/growth/application/growth-service";
import { getMonthlyRecapCelebration } from "@/modules/growth/application/monthly-recap-service";

describe("演出の不要な読み取り", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未確認のロール達成記録がなければ重い読み取りを呼ばない", async () => {
    mocks.getPendingRoleAchievementCelebration.mockResolvedValue(null);

    await expect(getRoleAchievementCelebration("member-1")).resolves.toBeNull();

    expect(mocks.getMemberGrowthData).not.toHaveBeenCalled();
    expect(mocks.listMemberRoleAchievements).not.toHaveBeenCalled();
  });

  it("前月に出来事がなければ月のまとめを計算しない", async () => {
    mocks.findMember.mockResolvedValue({
      createdAt: new Date("2026-09-01T00:00:00+09:00"),
      lastRecapSeenMonth: null
    });
    mocks.getBadgeCalculationData.mockResolvedValue({
      assessments: [],
      memberSkills: [],
      levelChanges: [],
      targetRequirements: [],
      mentoredCheers: [],
      firstMoverLevelChangeIds: [],
      prerequisites: []
    });
    mocks.listMemberRoleAchievements.mockResolvedValue([]);
    mocks.hasMonthlyRecapVoices.mockResolvedValue(false);

    await expect(getMonthlyRecapCelebration(
      "member-1",
      new Date("2026-11-15T00:00:00+09:00")
    )).resolves.toBeNull();

    expect(mocks.getMemberGrowthData).not.toHaveBeenCalled();
  });
});
