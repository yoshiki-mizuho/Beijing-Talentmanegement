import { NotificationStatus, SkillSelfAssessmentStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function getMemberDashboardData(memberId: string) {
  const [member, roles, pendingAssessmentCount, unreadNotificationCount] =
    await Promise.all([
      prisma.member.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          name: true,
          memberSkills: {
            select: {
              skillId: true,
              level: true,
              skill: {
                select: {
                  name: true,
                  category: { select: { name: true } }
                }
              }
            },
            orderBy: { skill: { name: "asc" } }
          }
        }
      }),
      prisma.role.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          roleRequirements: {
            where: { isRequired: true },
            select: {
              skillId: true,
              requiredLevel: true,
              isRequired: true,
              skill: {
                select: {
                  name: true,
                  category: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { name: "asc" }
      }),
      prisma.skillSelfAssessment.count({
        where: { memberId, status: SkillSelfAssessmentStatus.PENDING }
      }),
      prisma.notification.count({
        where: {
          recipientMemberId: memberId,
          status: NotificationStatus.UNREAD
        }
      })
    ]);

  return {
    member,
    roles,
    pendingAssessmentCount,
    unreadNotificationCount
  };
}

export type MemberDashboardData = Awaited<
  ReturnType<typeof getMemberDashboardData>
>;
