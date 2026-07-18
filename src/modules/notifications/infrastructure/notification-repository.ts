import { NotificationStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function listNotifications(memberId: string) {
  return prisma.notification.findMany({
    where: { recipientMemberId: memberId },
    orderBy: { createdAt: "desc" }
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
