import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countUnreadNotifications: vi.fn(),
  listLatestUnreadNotifications: vi.fn()
}));

vi.mock("@/modules/notifications/infrastructure/notification-repository", () => ({
  countUnreadNotifications: mocks.countUnreadNotifications,
  listLatestUnreadNotifications: mocks.listLatestUnreadNotifications
}));

import {
  countUnreadNotifications,
  listLatestUnreadNotifications
} from "@/modules/notifications/application/notification-service";

describe("notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countUnreadNotifications.mockResolvedValue(4);
    mocks.listLatestUnreadNotifications.mockResolvedValue([]);
  });

  it("repositoryへ対象メンバーと件数を渡して最新の未読通知を返す", async () => {
    await expect(listLatestUnreadNotifications("member-2", 5)).resolves.toEqual([]);
    expect(mocks.listLatestUnreadNotifications).toHaveBeenCalledWith("member-2", 5);
  });

  it("repositoryへ対象メンバーを渡して未読件数を返す", async () => {
    await expect(countUnreadNotifications("member-2")).resolves.toBe(4);
    expect(mocks.countUnreadNotifications).toHaveBeenCalledWith("member-2");
  });
});
