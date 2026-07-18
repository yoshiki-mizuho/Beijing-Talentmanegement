import { NotificationStatus, SkillSelfAssessmentStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function getDashboardData() {
  const [
    members,
    skillsCount,
    activeSkillsCount,
    roles,
    categories,
    pendingAssessmentsCount,
    unreadNotificationsCount
  ] = await Promise.all([
    prisma.member.findMany({
      select: {
        id: true,
        memberSkills: {
          select: {
            skillId: true,
            level: true
          }
        }
      }
    }),
    prisma.skill.count(),
    prisma.skill.count({ where: { isActive: true } }),
    prisma.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        roleRequirements: {
          select: {
            skillId: true,
            requiredLevel: true,
            isRequired: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.skillCategory.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            skills: true
          }
        }
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    prisma.skillSelfAssessment.count({
      where: { status: SkillSelfAssessmentStatus.PENDING }
    }),
    prisma.notification.count({
      where: { status: NotificationStatus.UNREAD }
    })
  ]);

  return {
    members,
    skillsCount,
    activeSkillsCount,
    roles,
    categories,
    pendingAssessmentsCount,
    unreadNotificationsCount
  };
}
