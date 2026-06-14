import { NotificationStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function listNotifications(memberId: string) {
  return prisma.notification.findMany({
    where: { recipientMemberId: memberId },
    include: {
      skillSelfAssessment: {
        include: {
          member: true,
          skill: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
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
