import { NotificationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notificationCount: vi.fn(),
  notificationUpdateMany: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    notification: {
      count: mocks.notificationCount,
      updateMany: mocks.notificationUpdateMany
    }
  }
}));

import {
  countUnreadNotifications,
  markAllNotificationsRead
} from "@/modules/notifications/infrastructure/notification-repository";

describe("countUnreadNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notificationCount.mockResolvedValue(3);
    mocks.notificationUpdateMany.mockResolvedValue({ count: 2 });
  });

  it("ログイン中メンバーの未読通知だけを集計する", async () => {
    await expect(countUnreadNotifications("member-1")).resolves.toBe(3);

    expect(mocks.notificationCount).toHaveBeenCalledWith({
      where: {
        recipientMemberId: "member-1",
        status: NotificationStatus.UNREAD
      }
    });
  });

  it("ログイン中メンバーの未読通知だけを一括で既読にする", async () => {
    await expect(markAllNotificationsRead("member-1")).resolves.toEqual({ count: 2 });

    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith({
      where: {
        recipientMemberId: "member-1",
        status: NotificationStatus.UNREAD
      },
      data: {
        status: NotificationStatus.READ,
        readAt: expect.any(Date)
      }
    });
  });
});
