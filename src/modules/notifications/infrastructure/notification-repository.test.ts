import { NotificationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notificationCount: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    notification: {
      count: mocks.notificationCount
    }
  }
}));

import { countUnreadNotifications } from "@/modules/notifications/infrastructure/notification-repository";

describe("countUnreadNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notificationCount.mockResolvedValue(3);
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
});