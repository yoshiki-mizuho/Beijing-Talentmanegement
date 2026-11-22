import {
  AuthRole,
  NotificationStatus,
  NotificationType,
  Prisma,
  type SkillSelfAssessment,
  SkillLevelChangeSource,
  SkillSelfAssessmentStatus,
} from "@prisma/client";
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from "@/modules/audit/domain/audit-action";
import { diffForAudit } from "@/modules/audit/domain/audit-diff";
import { recordAuditLog, recordAuditLogs } from "@/modules/audit/infrastructure/audit-repository";
import type {
  MemberSkillInput,
  MemberTargetRoleInput
} from "@/modules/members/domain/member-schema";
import type { MemberSearchInput } from "@/modules/members/domain/member-search";
import { shouldRecordSkillLevelChange } from "@/modules/members/domain/skill-level-change-policy";
import type {
  SkillAssessmentApprovalBatchInput,
  SkillAssessmentBatchInput,
  SkillAssessmentInput,
  SkillAssessmentReviewInput
} from "@/modules/members/domain/skill-assessment-schema";
import { recordRoleAchievements } from "@/modules/roles/application/role-achievement-service";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";
import { getDirectLeaderIds, getOrganization, getUsers } from "@/server/platform/directory";
import { ensureScopeMembers } from "@/modules/members/infrastructure/member-scope-repository";

export function buildMemberSearchWhere(
  input?: MemberSearchInput,
  _organizationNodeIds?: string[]
): Prisma.MemberWhereInput {
  void _organizationNodeIds;
  return {
    ...(input?.status ? { status: input.status } : {}),
    ...(input?.skillId || input?.minLevel
      ? {
          memberSkills: {
            some: {
              ...(input.skillId ? { skillId: input.skillId } : {}),
              ...(input.minLevel ? { level: { gte: input.minLevel } } : {})
            }
          }
        }
      : {})
  };
}

export async function listMembers(input?: MemberSearchInput, memberIds?: string[]) {
  const members = await prisma.member.findMany({
    where: {
      AND: [
        buildMemberSearchWhere(input),
        ...(memberIds ? [{ id: { in: memberIds } }] : [])
      ]
    },
    include: {
      targetRole: {
        select: {
          id: true,
          name: true,
          isActive: true,
          roleRequirements: {
            select: {
              skillId: true,
              requiredLevel: true,
              isRequired: true,
              anyOfGroup: true
            }
          }
        }
      },
      growthHint: { select: { generatedAt: true } },
      roleAchievements: { select: { roleId: true, achievedAt: true } },
      selfAssessments: {
        where: { status: SkillSelfAssessmentStatus.PENDING },
        select: {
          skillId: true,
          requestedLevel: true,
          skill: { select: { name: true, category: { select: { name: true } } } }
        }
      },
      memberSkills: {
        include: {
          skill: {
            include: {
              category: true
            }
          }
        },
        orderBy: {
          skill: {
            name: "asc"
          }
        }
      }
    },
    orderBy: { id: "asc" }
  });

  if (!input?.roleId) {
    return members;
  }

  return members.filter((member) =>
    member.roleAchievements.some((achievement) => achievement.roleId === input.roleId)
  );
}

export async function getMemberById(memberId: string) {
  const members = await listMembers(undefined, [memberId]);
  return members.find((member) => member.id === memberId) ?? null;
}

export function getGrowthHintMemberContext(memberId: string, since: Date) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      memberSkills: {
        where: { approvedAt: { not: null } },
        select: {
          skillId: true,
          level: true,
          skill: { select: { name: true, category: { select: { name: true } } } }
        }
      },
      targetRole: {
        select: {
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
      skillLevelChanges: {
        where: { changedAt: { gte: since } },
        orderBy: [{ changedAt: "asc" }, { id: "asc" }],
        select: {
          skillId: true,
          fromLevel: true,
          toLevel: true,
          source: true,
          skill: { select: { name: true } }
        }
      }
    }
  });
}

export async function upsertMemberSkill(
  input: MemberSkillInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.memberSkill.findFirst({
      where: { memberId: input.memberId, skillId: input.skillId }
    });
    const changedAt = new Date();
    const memberSkill = current
      ? await tx.memberSkill.update({
          where: { id: current.id },
          data: { level: input.level, lastAssessedAt: changedAt }
        })
      : await tx.memberSkill.create({
          data: {
            memberId: input.memberId,
            skillId: input.skillId,
            level: input.level,
            lastAssessedAt: changedAt
          }
        });

    if (shouldRecordSkillLevelChange(current?.level ?? null, input.level)) {
      await tx.skillLevelChange.create({
        data: {
          memberId: input.memberId,
          skillId: input.skillId,
          fromLevel: current?.level ?? null,
          toLevel: input.level,
          source: SkillLevelChangeSource.DIRECT_EDIT,
          changedByMemberId: input.changedByMemberId,
          changedAt
        }
      });
    }

    const diff = diffForAudit(
      current ? { level: current.level } : {},
      { level: memberSkill.level }
    );
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: current
          ? AUDIT_ACTION.MEMBER_SKILL_UPDATE
          : AUDIT_ACTION.MEMBER_SKILL_CREATE,
        targetType: AUDIT_TARGET_TYPE.MEMBER_SKILL,
        targetId: memberSkill.id,
        before: current ? diff.before : undefined,
        after: diff.after,
        metadata: { memberId: input.memberId, skillId: input.skillId }
      });
    }

    await recordRoleAchievements(tx, { memberIds: [input.memberId] });

    return memberSkill;
  });
}

export async function removeMemberSkill(
  memberId: string,
  skillId: string,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const changedAt = new Date();
    const existing = await tx.memberSkill.findFirstOrThrow({
      where: { memberId, skillId },
      select: { id: true }
    });
    const removed = await tx.memberSkill.delete({
      where: { id: existing.id }
    });
    await tx.skillLevelChange.create({
      data: {
        memberId,
        skillId,
        fromLevel: removed.level,
        toLevel: null,
        source: SkillLevelChangeSource.DIRECT_EDIT,
        changedByMemberId: actorMemberId,
        changedAt
      }
    });
    await recordAuditLog(tx, {
      actorMemberId,
      action: AUDIT_ACTION.MEMBER_SKILL_DELETE,
      targetType: AUDIT_TARGET_TYPE.MEMBER_SKILL,
      targetId: removed.id,
      before: { level: removed.level },
      metadata: { memberId, skillId }
    });
    return removed;
  });
}

export async function listMemberSkillAssessments(memberId: string) {
  return prisma.skillSelfAssessment.findMany({
    where: { memberId },
    include: {
      skill: {
        include: {
          category: true
        }
      },
      reviewedByMember: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getMemberSkillSheetContext(memberId: string) {
  const [
    member,
    latestAssessments,
    pendingAssessments,
    assessmentHistory,
    latestAssessmentDates,
    latestLevelChangeDates
  ] = await Promise.all([
    prisma.member.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        memberSkills: {
          select: {
            skillId: true,
            level: true
          }
        },
        targetRole: {
          select: {
            name: true,
            roleRequirements: {
              select: {
                skillId: true,
                requiredLevel: true
                ,anyOfGroup: true
              }
            }
          }
        }
      }
    }),
    prisma.skillSelfAssessment.findMany({
      where: { memberId },
      select: {
        skillId: true,
        status: true,
        managerComment: true
      },
      orderBy: { createdAt: "desc" },
      distinct: ["skillId"]
    }),
    prisma.skillSelfAssessment.findMany({
      where: {
        memberId,
        status: SkillSelfAssessmentStatus.PENDING
      },
      select: {
        skillId: true,
        requestedLevel: true
      }
    }),
    prisma.skillSelfAssessment.findMany({
      where: { memberId },
      select: {
        id: true,
        requestedLevel: true,
        status: true,
        managerComment: true,
        applicantComment: true,
        createdAt: true,
        skill: {
          select: {
            id: true,
            name: true,
            category: {
              select: { name: true }
            }
          }
        },
        skillLevelChanges: {
          select: { toLevel: true },
          orderBy: { changedAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.skillSelfAssessment.groupBy({
      by: ["skillId"],
      where: { memberId },
      _max: { createdAt: true }
    }),
    prisma.skillLevelChange.groupBy({
      by: ["skillId"],
      where: { memberId },
      _max: { changedAt: true }
    })
  ]);

  return {
    memberSkills: member.memberSkills,
    targetRoleName: member.targetRole?.name ?? null,
    targetRequirements: member.targetRole?.roleRequirements ?? [],
    pendingAssessments,
    latestAssessments,
    assessmentHistory,
    latestAssessmentDates,
    latestLevelChangeDates
  };
}

function pendingSkillAssessmentWhere(
  reviewerRole: AuthRole,
  scopedMemberIds: string[]
): Prisma.SkillSelfAssessmentWhereInput {
  return {
    status: SkillSelfAssessmentStatus.PENDING,
    ...(reviewerRole === AuthRole.ADMIN
      ? {}
      : {
          memberId: { in: scopedMemberIds }
        })
  };
}

export async function listPendingSkillAssessments(
  reviewerRole: AuthRole,
  scopedMemberIds: string[]
) {
  return prisma.skillSelfAssessment.findMany({
    where: pendingSkillAssessmentWhere(reviewerRole, scopedMemberIds),
    include: {
      member: {
        select: {
          id: true,
          memberSkills: {
            select: {
              skillId: true,
              level: true
            }
          },
          targetRole: {
            select: {
              id: true,
              name: true,
              roleRequirements: {
                select: {
                  skillId: true,
                  requiredLevel: true
                  ,anyOfGroup: true
                }
              }
            }
          }
        }
      },
      skill: {
        include: {
          category: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

export function countPendingSkillAssessments(
  reviewerRole: AuthRole,
  scopedMemberIds: string[]
) {
  return prisma.skillSelfAssessment.count({
    where: pendingSkillAssessmentWhere(reviewerRole, scopedMemberIds)
  });
}

export async function getSkillApprovalInsightContext(
  assessments: Array<{
    id: string;
    memberId: string;
    skillId: string;
    member: {
      targetRole: { id: string } | null;
    };
  }>
) {
  if (assessments.length === 0) {
    return { history: [], peers: [] };
  }

  const memberIds = [...new Set(assessments.map((item) => item.memberId))];
  const skillIds = [...new Set(assessments.map((item) => item.skillId))];
  const targetRoleIds = [
    ...new Set(
      assessments.flatMap((item) => item.member.targetRole?.id ?? [])
    )
  ];

  const [history, peers] = await Promise.all([
    prisma.skillSelfAssessment.findMany({
      where: {
        memberId: { in: memberIds },
        skillId: { in: skillIds },
        id: { notIn: assessments.map((item) => item.id) },
        status: { not: SkillSelfAssessmentStatus.PENDING }
      },
      select: {
        id: true,
        memberId: true,
        skillId: true,
        requestedLevel: true,
        status: true,
        managerComment: true,
        reviewedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.member.findMany({
      where: {
        status: "ACTIVE",
        ...(targetRoleIds.length > 0
          ? { OR: [{ targetRoleId: { in: targetRoleIds } }, { targetRoleId: null }] }
          : {})
      },
      select: {
        id: true,
        targetRoleId: true,
        memberSkills: {
          where: { skillId: { in: skillIds } },
          select: { skillId: true, level: true }
        }
      }
    })
  ]);

  return { history, peers };
}

export function countMemberSkillAssessments(memberId: string) {
  return prisma.skillSelfAssessment.count({ where: { memberId } });
}

export function countMemberSkills(memberId: string) {
  return prisma.memberSkill.count({ where: { memberId } });
}

export async function hasMemberTargetRole(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { targetRoleId: true }
  });
  return Boolean(member?.targetRoleId);
}

export async function createSkillAssessment(
  input: SkillAssessmentInput,
  actorMemberId: string | null
) {
  const [assessment] = await createSkillAssessments({
    memberId: input.memberId,
    assessments: [{
      skillId: input.skillId,
      requestedLevel: input.requestedLevel,
      yearsOfExperience: input.yearsOfExperience,
      applicantComment: input.applicantComment
    }]
  }, actorMemberId);

  return assessment;
}

export async function createSkillAssessments(
  input: SkillAssessmentBatchInput,
  actorMemberId: string | null
) {
  const applicant = await prisma.member.findUniqueOrThrow({
    where: { id: input.memberId },
    select: { platformUserId: true }
  });
  let reviewerMemberIds: string[] = [];
  if (applicant.platformUserId) {
    try {
      const directLeaderIds = await getDirectLeaderIds(applicant.platformUserId);
      const reviewerUsers = directLeaderIds.length > 0
        ? await getUsers(directLeaderIds)
        : new Map(
            [...(await getOrganization(applicant.platformUserId)).members.values()]
              .filter((user) => user.role === "ADMIN")
              .map((user) => [user.id, user])
          );
      reviewerMemberIds = (await ensureScopeMembers(reviewerUsers))
        .map((member) => member.id)
        .filter((id) => id !== input.memberId);
    } catch {
      reviewerMemberIds = [];
    }
  }
  return prisma.$transaction(async (tx) => {
    const skillIds = input.assessments.map((assessment) => assessment.skillId);
    const [skills, pendingAssessments] = await Promise.all([
      tx.skill.findMany({
        where: { id: { in: skillIds }, isActive: true },
        select: { id: true, name: true }
      }),
      tx.skillSelfAssessment.findMany({
        where: {
          memberId: input.memberId,
          skillId: { in: skillIds },
          status: SkillSelfAssessmentStatus.PENDING
        },
        select: { skillId: true }
      })
    ]);

    if (skills.length !== skillIds.length) {
      throw new UserFacingError(
        "申請対象に存在しない、または無効なスキルが含まれています。"
      );
    }
    if (pendingAssessments.length > 0) {
      throw new UserFacingError("すでに承認待ちのスキルが含まれています。");
    }

    const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]));
    const assessments: SkillSelfAssessment[] = [];

    for (const item of input.assessments) {
      assessments.push(await tx.skillSelfAssessment.create({
        data: {
          memberId: input.memberId,
          skillId: item.skillId,
          requestedLevel: item.requestedLevel,
          applicantComment: item.applicantComment,
          yearsOfExperience: item.yearsOfExperience === undefined
            ? undefined
            : new Prisma.Decimal(item.yearsOfExperience)
        }
      }));
    }

    const assessmentLabels = assessments.map(
      (assessment) => `${skillNames.get(assessment.skillId)} Lv${assessment.requestedLevel}`
    );
    const notificationBody = assessments.length === 1
      ? `${assessmentLabels[0]} の申請が届きました。`
      : `${assessments.length}件の申請が届きました（${assessmentLabels.slice(0, 2).join("・")}${assessments.length >= 3 ? " ほか" : ""}）。`;
    const notifications = reviewerMemberIds.map((recipientMemberId) => ({
      recipientMemberId,
      actorMemberId: input.memberId,
      type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
      skillSelfAssessmentId: assessments[0].id,
      title: "スキル申請の承認依頼",
      body: notificationBody
    }));

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    await recordAuditLogs(
      tx,
      assessments.map((assessment) => ({
        actorMemberId,
        action: AUDIT_ACTION.SKILL_ASSESSMENT_CREATE,
        targetType: AUDIT_TARGET_TYPE.SKILL_SELF_ASSESSMENT,
        targetId: assessment.id,
        after: {
          memberId: assessment.memberId,
          skillId: assessment.skillId,
          requestedLevel: assessment.requestedLevel,
          yearsOfExperience: assessment.yearsOfExperience
        }
      }))
    );

    return assessments;
  });
}

async function reviewSkillAssessmentInTransaction(
  tx: Prisma.TransactionClient,
  input: SkillAssessmentReviewInput
) {
    const assessment = await tx.skillSelfAssessment.findUnique({
      where: { id: input.assessmentId },
      include: {
        member: true,
        skill: true
      }
    });

    if (!assessment) {
      throw new UserFacingError(
        `申請（ID: ${input.assessmentId}）が見つかりません。`
      );
    }

    const assessmentLabel = `${assessment.skill.name}の申請（申請ID: ${assessment.id}）`;

    if (assessment.status !== SkillSelfAssessmentStatus.PENDING) {
      throw new UserFacingError(
        `${assessmentLabel}は承認待ちではありません。`
      );
    }

    const reviewStatus =
      input.status === SkillSelfAssessmentStatus.CORRECTED &&
      input.correctedLevel === assessment.requestedLevel
        ? SkillSelfAssessmentStatus.APPROVED
        : input.status;

    const approvedLevel =
      reviewStatus === SkillSelfAssessmentStatus.CORRECTED
        ? input.correctedLevel
        : assessment.requestedLevel;

    const reviewedAt = new Date();
    if (reviewStatus !== SkillSelfAssessmentStatus.REJECTED && approvedLevel) {
      const currentMemberSkill = await tx.memberSkill.findFirst({
        where: {
          memberId: assessment.memberId,
          skillId: assessment.skillId
        }
      });
      const memberSkillData = {
          level: approvedLevel,
          yearsOfExperience: assessment.yearsOfExperience,
          approvedByMemberId: input.reviewerMemberId,
          approvedAt: reviewedAt,
          lastAssessedAt: reviewedAt
      };
      if (currentMemberSkill) {
        await tx.memberSkill.update({
          where: { id: currentMemberSkill.id },
          data: memberSkillData
        });
      } else {
        await tx.memberSkill.create({
          data: {
          memberId: assessment.memberId,
          skillId: assessment.skillId,
          ...memberSkillData
          }
        });
      }
      if (shouldRecordSkillLevelChange(currentMemberSkill?.level ?? null, approvedLevel)) {
        await tx.skillLevelChange.create({
          data: {
            memberId: assessment.memberId,
            skillId: assessment.skillId,
            fromLevel: currentMemberSkill?.level ?? null,
            toLevel: approvedLevel,
            source: reviewStatus === SkillSelfAssessmentStatus.CORRECTED
              ? SkillLevelChangeSource.ASSESSMENT_CORRECTED
              : SkillLevelChangeSource.ASSESSMENT_APPROVED,
            skillSelfAssessmentId: assessment.id,
            changedByMemberId: input.reviewerMemberId,
            changedAt: reviewedAt
          }
        });
      }
      await recordRoleAchievements(tx, { memberIds: [assessment.memberId] });
    }

    const reviewedAssessment = await tx.skillSelfAssessment.update({
      where: { id: input.assessmentId },
      data: {
        status: reviewStatus,
        managerComment: input.managerComment,
        reviewedByMemberId: input.reviewerMemberId,
        reviewedAt
      }
    });
    const remainingPendingAssessments = await tx.skillSelfAssessment.count({
      where: {
        memberId: assessment.memberId,
        status: SkillSelfAssessmentStatus.PENDING
      }
    });
    if (remainingPendingAssessments === 0) {
      await tx.notification.updateMany({
        where: {
          type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
          status: NotificationStatus.UNREAD,
          skillSelfAssessment: { memberId: assessment.memberId }
        },
        data: {
          status: NotificationStatus.READ,
          readAt: reviewedAt
        }
      });
    }
    const notificationType =
      reviewStatus === SkillSelfAssessmentStatus.APPROVED
        ? NotificationType.SKILL_ASSESSMENT_APPROVED
        : reviewStatus === SkillSelfAssessmentStatus.CORRECTED
          ? NotificationType.SKILL_ASSESSMENT_CORRECTED
          : NotificationType.SKILL_ASSESSMENT_REJECTED;

    const resultBody = reviewStatus === SkillSelfAssessmentStatus.APPROVED
      ? `${assessment.skill.name} Lv.${assessment.requestedLevel} の申請が承認されました。`
      : reviewStatus === SkillSelfAssessmentStatus.CORRECTED
        ? `${assessment.skill.name} の申請が Lv${approvedLevel} に補正して承認されました。`
        : input.managerComment
          ? `${assessment.skill.name} の申請が差し戻されました。理由：${input.managerComment}`
          : `${assessment.skill.name} の申請が差し戻されました。`;

    await tx.notification.create({
      data: {
        recipientMemberId: assessment.memberId,
        actorMemberId: input.reviewerMemberId,
        type: notificationType,
        skillSelfAssessmentId: assessment.id,
        title: "スキル申請の承認結果",
        body: resultBody
      }
    });

    const action = reviewStatus === SkillSelfAssessmentStatus.APPROVED
      ? AUDIT_ACTION.SKILL_ASSESSMENT_APPROVE
      : reviewStatus === SkillSelfAssessmentStatus.CORRECTED
        ? AUDIT_ACTION.SKILL_ASSESSMENT_CORRECT
        : AUDIT_ACTION.SKILL_ASSESSMENT_REJECT;
    await recordAuditLog(tx, {
      actorMemberId: input.reviewerMemberId,
      action,
      targetType: AUDIT_TARGET_TYPE.SKILL_SELF_ASSESSMENT,
      targetId: assessment.id,
      before: { status: assessment.status },
      after: { status: reviewedAssessment.status },
      metadata: {
        memberId: assessment.memberId,
        skillId: assessment.skillId,
        requestedLevel: assessment.requestedLevel,
        approvedLevel: reviewStatus === SkillSelfAssessmentStatus.REJECTED
          ? null
          : approvedLevel,
        comment: input.managerComment ?? null
      }
    });

    return reviewedAssessment;
}

export async function reviewSkillAssessment(input: SkillAssessmentReviewInput) {
  return prisma.$transaction((tx) =>
    reviewSkillAssessmentInTransaction(tx, input)
  );
}

export function getAssessmentMemberIds(assessmentIds: string[]) {
  return prisma.skillSelfAssessment.findMany({
    where: { id: { in: assessmentIds } },
    select: { id: true, memberId: true }
  });
}

export async function approveSkillAssessments(
  input: SkillAssessmentApprovalBatchInput
) {
  return prisma.$transaction(async (tx) => {
    const approvedAssessments = [];

    for (const assessmentId of input.assessmentIds) {
      approvedAssessments.push(
        await reviewSkillAssessmentInTransaction(tx, {
          assessmentId,
          reviewerMemberId: input.reviewerMemberId,
          reviewerRole: input.reviewerRole,
          status: SkillSelfAssessmentStatus.APPROVED
        })
      );
    }

    return approvedAssessments;
  });
}

export async function updateMemberTargetRole(
  input: MemberTargetRoleInput,
  actorMemberId: string | null
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.member.findUniqueOrThrow({
      where: { id: input.memberId }
    });
    if (input.targetRoleId) {
      const role = await tx.role.findFirst({
        where: { id: input.targetRoleId, isActive: true },
        select: { id: true }
      });
      if (!role) {
        throw new UserFacingError("目標ロールには有効なロールを指定してください。");
      }
    }
    const member = await tx.member.update({
      where: { id: input.memberId },
      data: { targetRoleId: input.targetRoleId }
    });
    const diff = diffForAudit(
      { targetRoleId: before.targetRoleId },
      { targetRoleId: member.targetRoleId }
    );
    if (diff) {
      await recordAuditLog(tx, {
        actorMemberId,
        action: AUDIT_ACTION.MEMBER_TARGET_ROLE_UPDATE,
        targetType: AUDIT_TARGET_TYPE.MEMBER,
        targetId: input.memberId,
        ...diff
      });
    }
    return member;
  });
}
