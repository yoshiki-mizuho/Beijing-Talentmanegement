import {
  MemberStatus,
  NotificationStatus,
  NotificationType
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function getMemberGrowthData(memberId: string) {
  const [member, roles, categories, assessments, levelChanges, mentoredCheers, receivedCheers, mentorCandidates, levelDefinitions] =
    await Promise.all([
      prisma.member.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          name: true,
          targetRoleId: true,
          targetRole: {
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
                      category: { select: { id: true, name: true } }
                    }
                  }
                }
              }
            }
          },
          memberSkills: {
            select: {
              skillId: true,
              level: true,
              skill: {
                select: {
                  name: true,
                  category: { select: { id: true, name: true } }
                }
              }
            },
            orderBy: { skill: { name: "asc" } }
          }
        }
      }),
      prisma.role.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }),
      prisma.skillCategory.findMany({
        where: { skills: { some: { isActive: true } } },
        select: { id: true, name: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
      }),
      prisma.skillSelfAssessment.findMany({
        where: { memberId },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.skillLevelChange.findMany({
        where: { memberId },
        select: {
          id: true,
          skillId: true,
          fromLevel: true,
          toLevel: true,
          source: true,
          changedAt: true,
          skill: {
            select: {
              name: true,
              category: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { changedAt: "asc" }
      }),
      prisma.cheer.findMany({
        where: { mentorMemberId: memberId },
        select: { toMemberId: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.cheer.findMany({
        where: { toMemberId: memberId },
        select: {
          id: true,
          message: true,
          createdAt: true,
          fromMember: { select: { name: true } },
          targetSkill: { select: { id: true, name: true } },
          mentorMember: {
            select: {
              name: true,
              memberSkills: { select: { skillId: true, level: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 3
      }),
      prisma.member.findMany({
        where: { status: MemberStatus.ACTIVE, id: { not: memberId } },
        select: {
          id: true,
          name: true,
          jobTitle: true,
          status: true,
          memberSkills: {
            where: { level: { gte: 4 } },
            select: {
              skillId: true,
              level: true,
              skill: { select: { name: true } }
            }
          }
        },
        orderBy: { name: "asc" }
      }),
      prisma.skillLevel.findMany({
        select: { level: true, description: true },
        orderBy: { level: "asc" }
      })
    ]);

  return {
    member,
    roles,
    categories,
    assessments,
    levelChanges,
    mentoredCheers,
    receivedCheers,
    mentorCandidates,
    levelDefinitions
  };
}

export type MemberGrowthData = Awaited<ReturnType<typeof getMemberGrowthData>>;

export function listUnreadLevelUpNotifications(memberId: string) {
  return prisma.notification.findMany({
    where: {
      recipientMemberId: memberId,
      status: NotificationStatus.UNREAD,
      type: {
        in: [
          NotificationType.SKILL_ASSESSMENT_APPROVED,
          NotificationType.SKILL_ASSESSMENT_CORRECTED
        ]
      }
    },
    select: {
      id: true,
      createdAt: true,
      skillLevelChange: {
        select: {
          id: true,
          skillId: true,
          fromLevel: true,
          toLevel: true,
          changedAt: true,
          skill: { select: { name: true } },
          changedByMember: { select: { name: true } },
          skillSelfAssessment: { select: { managerComment: true } }
        }
      },
      skillSelfAssessment: {
        select: {
          managerComment: true,
          reviewedByMember: { select: { name: true } },
          skillLevelChanges: {
            select: {
              id: true,
              skillId: true,
              fromLevel: true,
              toLevel: true,
              changedAt: true,
              skill: { select: { name: true } },
              changedByMember: { select: { name: true } },
              skillSelfAssessment: { select: { managerComment: true } }
            },
            orderBy: { changedAt: "desc" },
            take: 1
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

export type UnreadLevelUpNotification = Awaited<
  ReturnType<typeof listUnreadLevelUpNotifications>
>[number];
