import {
  NotificationStatus,
  NotificationType,
  SkillSelfAssessmentStatus
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notificationCount: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationUpdateMany: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    notification: {
      count: mocks.notificationCount,
      findMany: mocks.notificationFindMany,
      updateMany: mocks.notificationUpdateMany
    }
  }
}));

import {
  countUnreadNotifications,
  listNotifications,
  listLatestUnreadNotifications,
  markAllNotificationsRead
} from "@/modules/notifications/infrastructure/notification-repository";

describe("countUnreadNotifications", () => {
  const actionableUnreadWhere = {
    status: NotificationStatus.UNREAD,
    OR: [
      { type: { not: NotificationType.SKILL_ASSESSMENT_REQUESTED } },
      {
        type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
        skillSelfAssessment: {
          member: {
            selfAssessments: {
              some: { status: SkillSelfAssessmentStatus.PENDING }
            }
          }
        }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notificationCount.mockResolvedValue(3);
    mocks.notificationFindMany.mockResolvedValue([]);
    mocks.notificationUpdateMany.mockResolvedValue({ count: 2 });
  });

  it("ログイン中メンバーの最新の未読通知だけを指定件数取得する", async () => {
    await expect(listLatestUnreadNotifications("member-1", 5)).resolves.toEqual([]);

    expect(mocks.notificationFindMany).toHaveBeenCalledWith({
      where: {
        recipientMemberId: "member-1",
        ...actionableUnreadWhere
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });
  });

  it("ログイン中メンバーの未読通知だけを集計する", async () => {
    await expect(countUnreadNotifications("member-1")).resolves.toBe(3);

    expect(mocks.notificationCount).toHaveBeenCalledWith({
      where: {
        recipientMemberId: "member-1",
        ...actionableUnreadWhere
      }
    });
  });

  it("未読一覧では承認待ちが残っている承認依頼だけを取得する", async () => {
    await expect(
      listNotifications("member-1", { unreadOnly: true })
    ).resolves.toEqual([]);

    expect(mocks.notificationFindMany).toHaveBeenCalledWith({
      where: {
        recipientMemberId: "member-1",
        ...actionableUnreadWhere
      },
      orderBy: { createdAt: "desc" }
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
