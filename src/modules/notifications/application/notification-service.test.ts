import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countUnreadNotifications: vi.fn()
}));

vi.mock("@/modules/notifications/infrastructure/notification-repository", () => ({
  countUnreadNotifications: mocks.countUnreadNotifications
}));

import { countUnreadNotifications } from "@/modules/notifications/application/notification-service";

describe("notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countUnreadNotifications.mockResolvedValue(4);
  });

  it("repositoryへ対象メンバーを渡して未読件数を返す", async () => {
    await expect(countUnreadNotifications("member-2")).resolves.toBe(4);
    expect(mocks.countUnreadNotifications).toHaveBeenCalledWith("member-2");
  });
});