import { MemberStatus, SkillSelfAssessmentStatus } from "@prisma/client";
import { nonGrowthLevelChangeSources } from "@/modules/growth/domain/level-change-source";

import { prisma } from "@/server/db/prisma";

export async function getTeamDashboardData(managerMemberId: string, reportMemberIds: string[]) {
  const [manager, reports] = await Promise.all([
    prisma.member.findUnique({
    where: { id: managerMemberId },
    select: {
      id: true,
      sentCheers: {
        select: { toMemberId: true, createdAt: true },
        orderBy: { createdAt: "desc" }
      },
      managedOneOnOneNotes: {
        where: { discussedAt: null },
        select: { memberId: true }
      },
    }
  }),
    prisma.member.findMany({
      where: { id: { in: reportMemberIds }, status: MemberStatus.ACTIVE },
        select: {
          id: true,
          createdAt: true,
          targetRole: {
            select: {
              id: true,
              name: true,
              roleRequirements: {
                where: { isRequired: true },
                select: {
                  skillId: true,
                  requiredLevel: true,
                  anyOfGroup: true,
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
            where: { source: { notIn: [...nonGrowthLevelChangeSources] } },
            select: {
              fromLevel: true,
              toLevel: true,
              changedAt: true
            },
            orderBy: { changedAt: "desc" }
          }
        },
      })
  ]);
  return manager ? { ...manager, reports } : null;
}

export function countSkillExperts(skillId: string, memberIds: string[]) {
  return prisma.memberSkill.count({
    where: {
      skillId,
      level: { gte: 4 },
      member: { id: { in: memberIds }, status: MemberStatus.ACTIVE }
    }
  });
}

export function isPendingAssessment(status: SkillSelfAssessmentStatus) {
  return status === SkillSelfAssessmentStatus.PENDING;
}

export type TeamDashboardData = Awaited<ReturnType<typeof getTeamDashboardData>>;
