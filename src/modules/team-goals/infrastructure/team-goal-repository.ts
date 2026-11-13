import { MemberStatus, type TeamGoal, type TeamGoalKind } from "@prisma/client";

import { nonGrowthLevelChangeSources } from "@/modules/growth/domain/level-change-source";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import { recordAuditLog } from "@/modules/audit/infrastructure/audit-repository";
import { prisma } from "@/server/db/prisma";

export function findManagerWithReports(managerId: string) {
  return prisma.member.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      reports: { where: { status: MemberStatus.ACTIVE }, select: { id: true } }
    }
  });
}

export function findMemberManagerId(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: { managerId: true }
  });
}

export function findTeamGoalCelebrationContext(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      managerId: true,
      status: true,
      teamGoalAcknowledgements: { select: { teamGoalId: true } }
    }
  });
}

export function findTeamGoalCelebrationCandidates(
  managerIds: string[],
  acknowledgedGoalIds: string[]
) {
  return prisma.teamGoal.findMany({
    where: {
      managerId: { in: managerIds },
      achievedAt: { not: null },
      id: { notIn: acknowledgedGoalIds }
    },
    include: { skill: { select: { name: true } } }
  });
}

export function findTeamGoalAcknowledgementTarget(teamGoalId: string, memberId: string) {
  return prisma.teamGoal.findUnique({
    where: { id: teamGoalId },
    select: {
      id: true,
      managerId: true,
      achievedAt: true,
      manager: {
        select: {
          reports: {
            where: { id: memberId, status: MemberStatus.ACTIVE },
            select: { id: true }
          }
        }
      }
    }
  });
}

export function createTeamGoalAcknowledgement(teamGoalId: string, memberId: string) {
  return prisma.teamGoalAcknowledgement.createMany({
    data: [{ teamGoalId, memberId }],
    skipDuplicates: true
  });
}

export function findLatestGoals(managerId: string) {
  return prisma.teamGoal.findMany({
    where: { managerId },
    orderBy: { createdAt: "desc" },
    include: {
      skill: { select: { name: true } },
      manager: { select: { id: true, name: true, avatarUpdatedAt: true } }
    }
  });
}

export function listActiveSkills(managerId: string) {
  return prisma.skill.findMany({
    where: { isActive: true },
    orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
      memberSkills: {
        where: { member: { managerId, status: MemberStatus.ACTIVE } },
        select: { level: true }
      }
    }
  });
}

export async function countGoalProgress(goal: TeamGoal, start: Date, end: Date) {
  const reportWhere = { managerId: goal.managerId, status: MemberStatus.ACTIVE };
  if (goal.kind === "SKILL_REACH") {
    return prisma.member.count({
      where: {
        ...reportWhere,
        memberSkills: { some: { skillId: goal.skillId!, level: { gte: goal.targetLevel! } } }
      }
    });
  }

  const changes = await prisma.skillLevelChange.findMany({
    where: {
      member: reportWhere,
      changedAt: { gte: start, lt: end },
      source: { notIn: [...nonGrowthLevelChangeSources] }
    },
    select: { memberId: true, fromLevel: true, toLevel: true }
  });
  const increases = changes.filter((change) =>
    change.toLevel !== null &&
    (change.fromLevel === null || change.toLevel > change.fromLevel)
  );
  return goal.kind === "LEVEL_UP_COUNT"
    ? increases.length
    : new Set(increases.map((change) => change.memberId)).size;
}

export function markGoalAchieved(id: string, achievedAt: Date) {
  return prisma.teamGoal.updateMany({
    where: { id, achievedAt: null },
    data: { achievedAt }
  });
}

export async function saveTeamGoal(input: {
  id?: string;
  managerId: string;
  kind: TeamGoalKind;
  skillId: string | null;
  targetLevel: number | null;
  targetCount: number;
  note: string | null;
  startMonth: string;
  months: number;
}) {
  return prisma.$transaction(async (tx) => {
    const before = input.id
      ? await tx.teamGoal.findUniqueOrThrow({ where: { id: input.id } })
      : null;
    const goal = input.id
      ? await tx.teamGoal.update({
          where: { id: input.id },
          data: {
            kind: input.kind,
            skillId: input.skillId,
            targetLevel: input.targetLevel,
            targetCount: input.targetCount,
            note: input.note,
            months: input.months
          }
        })
      : await tx.teamGoal.create({ data: input });
    await recordAuditLog(tx, {
      actorMemberId: input.managerId,
      action: input.id ? AUDIT_ACTION.TEAM_GOAL_UPDATE : AUDIT_ACTION.TEAM_GOAL_CREATE,
      targetType: AUDIT_TARGET_TYPE.TEAM_GOAL,
      targetId: goal.id,
      before: before ? auditSnapshot(before) : null,
      after: auditSnapshot(goal)
    });
    return goal;
  });
}

export function findActiveSkill(skillId: string) {
  return prisma.skill.findFirst({
    where: { id: skillId, isActive: true },
    select: { id: true }
  });
}

function auditSnapshot(goal: TeamGoal) {
  return {
    kind: goal.kind,
    skillId: goal.skillId,
    targetLevel: goal.targetLevel,
    targetCount: goal.targetCount,
    note: goal.note,
    startMonth: goal.startMonth,
    months: goal.months
  };
}
