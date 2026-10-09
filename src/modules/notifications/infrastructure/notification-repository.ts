import { NotificationStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function listNotifications(
  memberId: string,
  options: { unreadOnly?: boolean } = {}
) {
  return prisma.notification.findMany({
    where: {
      recipientMemberId: memberId,
      ...(options.unreadOnly ? { status: NotificationStatus.UNREAD } : {})
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function countUnreadNotifications(memberId: string) {
  return prisma.notification.count({
    where: {
      recipientMemberId: memberId,
      status: NotificationStatus.UNREAD
    }
  });
}

export async function findNotification(id: string, memberId: string) {
  return prisma.notification.findFirst({
    where: {
      id,
      recipientMemberId: memberId
    }
  });
}

export async function markNotificationRead(id: string, memberId: string) {
  return prisma.notification.updateMany({
    where: {
      id,
      recipientMemberId: memberId
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date()
    }
  });
}

export async function markAllNotificationsRead(memberId: string) {
  return prisma.notification.updateMany({
    where: {
      recipientMemberId: memberId,
      status: NotificationStatus.UNREAD
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date()
    }
  });
}
