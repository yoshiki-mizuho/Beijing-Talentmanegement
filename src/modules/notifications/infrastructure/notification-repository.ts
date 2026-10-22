import {
  NotificationStatus,
  NotificationType,
  Prisma,
  SkillSelfAssessmentStatus
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";

const actionableUnreadNotificationWhere: Prisma.NotificationWhereInput = {
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

export async function listNotifications(
  memberId: string,
  options: { unreadOnly?: boolean } = {}
) {
  return prisma.notification.findMany({
    where: {
      recipientMemberId: memberId,
      ...(options.unreadOnly ? actionableUnreadNotificationWhere : {})
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function countUnreadNotifications(memberId: string) {
  return prisma.notification.count({
    where: {
      recipientMemberId: memberId,
      ...actionableUnreadNotificationWhere
    }
  });
}

export async function listLatestUnreadNotifications(memberId: string, limit = 5) {
  return prisma.notification.findMany({
    where: {
      recipientMemberId: memberId,
      ...actionableUnreadNotificationWhere
    },
    orderBy: { createdAt: "desc" },
    take: limit
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
