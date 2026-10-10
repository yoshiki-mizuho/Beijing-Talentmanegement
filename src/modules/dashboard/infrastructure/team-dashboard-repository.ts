import { MemberStatus, SkillLevelChangeSource, SkillSelfAssessmentStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export function getTeamDashboardData(managerMemberId: string) {
  return prisma.member.findUnique({
    where: { id: managerMemberId },
    select: {
      id: true,
      name: true,
      department: { select: { name: true } },
      reports: {
        where: { status: MemberStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          createdAt: true,
          targetRole: {
            select: {
              name: true,
              roleRequirements: {
                where: { isRequired: true },
                select: {
                  skillId: true,
                  requiredLevel: true,
                  skill: { select: { name: true } }
                }
              }
            }
          },
          memberSkills: {
            select: { skillId: true, level: true }
          },
          selfAssessments: {
            select: {
              skillId: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: "desc" }
          },
          skillLevelChanges: {
            where: { source: { not: SkillLevelChangeSource.BACKFILL } },
            select: {
              fromLevel: true,
              toLevel: true,
              changedAt: true
            },
            orderBy: { changedAt: "desc" }
          }
        },
        orderBy: { name: "asc" }
      }
    }
  });
}

export function countSkillExperts(skillId: string) {
  return prisma.memberSkill.count({
    where: {
      skillId,
      level: { gte: 4 },
      member: { status: MemberStatus.ACTIVE }
    }
  });
}

export function isPendingAssessment(status: SkillSelfAssessmentStatus) {
  return status === SkillSelfAssessmentStatus.PENDING;
}

export type TeamDashboardData = Awaited<ReturnType<typeof getTeamDashboardData>>;
