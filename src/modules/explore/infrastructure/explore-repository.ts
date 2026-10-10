import { MemberStatus, SkillLevelChangeSource } from "@prisma/client";
import type { ProfileViewer } from "@/modules/explore/domain/explore-profile";
import { prisma } from "@/server/db/prisma";

export async function getExploreSourceData(viewer: ProfileViewer, since: Date) {
  const visible = [
    { isProfilePublic: true },
    { id: viewer.memberId },
    { managerId: viewer.memberId }
  ];
  const [viewerMember, skills, changes, candidates] = await Promise.all([
    prisma.member.findUnique({
      where: { id: viewer.memberId },
      select: {
        departmentId: true,
        targetRole: {
          select: {
            roleRequirements: {
              where: { isRequired: true },
              select: { skillId: true, requiredLevel: true }
            }
          }
        },
        memberSkills: { select: { skillId: true, level: true } }
      }
    }),
    prisma.skill.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: { select: { name: true } } },
      orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }]
    }),
    prisma.skillLevelChange.findMany({
      where: { changedAt: { gte: since } },
      select: {
        skillId: true,
        fromLevel: true,
        toLevel: true,
        source: true,
        changedAt: true,
        skill: { select: { name: true, category: { select: { name: true } } } }
      }
    }),
    prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        id: { not: viewer.memberId },
        ...(viewer.role === "ADMIN" ? {} : { OR: visible })
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
        jobTitle: true,
        memberSkills: { select: { skillId: true, level: true, skill: { select: { name: true } } } },
        skillLevelChanges: {
          where: { changedAt: { gte: since }, source: { not: SkillLevelChangeSource.BACKFILL } },
          select: { fromLevel: true, toLevel: true }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);
  return { viewerMember, skills, changes, candidates };
}

export function getProfileVisibility(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, managerId: true, status: true, isProfilePublic: true }
  });
}

export async function getSkillProfileSourceData(memberId: string) {
  const [member, roles] = await Promise.all([
    prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        id: true,
        name: true,
        email: true,
        department: { select: { name: true } },
        jobTitle: true,
        isProfilePublic: true,
        memberSkills: { select: { skillId: true, level: true, skill: { select: { name: true } } } },
        skillLevelChanges: {
          select: {
            skillId: true,
            fromLevel: true,
            toLevel: true,
            source: true,
            changedAt: true,
            skill: { select: { name: true } }
          },
          orderBy: { changedAt: "asc" }
        },
        selfAssessments: { select: { createdAt: true } },
        mentoredCheers: { select: { toMemberId: true, createdAt: true } },
        targetRole: {
          select: {
            roleRequirements: {
              where: { isRequired: true },
              select: { skillId: true, requiredLevel: true }
            }
          }
        }
      }
    }),
    prisma.role.findMany({
      where: { isActive: true },
      select: {
        name: true,
        roleRequirements: {
          where: { isRequired: true },
          select: { skillId: true, requiredLevel: true }
        }
      }
    })
  ]);
  return { member, roles };
}

export function updateProfileVisibility(memberId: string, isPublic: boolean) {
  return prisma.member.update({ where: { id: memberId }, data: { isProfilePublic: isPublic } });
}
