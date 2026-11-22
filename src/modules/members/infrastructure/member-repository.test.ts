import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotificationStatus,
  NotificationType,
  SkillSelfAssessmentStatus
} from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  memberFindUniqueOrThrowOutsideTransaction: vi.fn(),
  memberFindUniqueOrThrow: vi.fn(),
  memberUpdate: vi.fn(),
  memberCount: vi.fn(),
  skillFindMany: vi.fn(),
  assessmentFindMany: vi.fn(),
  assessmentFindUnique: vi.fn(),
  assessmentCreate: vi.fn(),
  assessmentUpdate: vi.fn(),
  assessmentCount: vi.fn(),
  userFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  userCreate: vi.fn(),
  notificationCreateMany: vi.fn(),
  notificationCreate: vi.fn(),
  notificationUpdateMany: vi.fn(),
  memberSkillFindFirst: vi.fn(),
  memberSkillCreate: vi.fn(),
  memberSkillUpdate: vi.fn(),
  skillLevelChangeCreate: vi.fn(),
  auditLogCreate: vi.fn(),
  auditLogCreateMany: vi.fn(),
  recordRoleAchievements: vi.fn(),
  getDirectLeaderIds: vi.fn(),
  getOrganization: vi.fn(),
  getUsers: vi.fn(),
  ensureScopeMembers: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    member: { findUniqueOrThrow: mocks.memberFindUniqueOrThrowOutsideTransaction }
  }
}));
vi.mock("@/modules/roles/application/role-achievement-service", () => ({
  recordRoleAchievements: mocks.recordRoleAchievements
}));
vi.mock("@/server/platform/directory", () => ({
  getDirectLeaderIds: mocks.getDirectLeaderIds,
  getOrganization: mocks.getOrganization,
  getUsers: mocks.getUsers
}));
vi.mock("@/modules/members/infrastructure/member-scope-repository", () => ({
  ensureScopeMembers: mocks.ensureScopeMembers
}));

import {
  approveSkillAssessments,
  buildMemberSearchWhere,
  createSkillAssessments,
  updateMember
} from "@/modules/members/infrastructure/member-repository";

const transactionClient = {
  member: {
    findUniqueOrThrow: mocks.memberFindUniqueOrThrow,
    update: mocks.memberUpdate,
    count: mocks.memberCount
  },
  skill: { findMany: mocks.skillFindMany },
  skillSelfAssessment: {
    findMany: mocks.assessmentFindMany,
    findUnique: mocks.assessmentFindUnique,
    update: mocks.assessmentUpdate,
    create: mocks.assessmentCreate,
    count: mocks.assessmentCount
  },
  user: {
    findMany: mocks.userFindMany,
    findFirst: mocks.userFindFirst,
    update: mocks.userUpdate,
    create: mocks.userCreate
  },
  notification: {
    createMany: mocks.notificationCreateMany,
    create: mocks.notificationCreate,
    updateMany: mocks.notificationUpdateMany
  },
  memberSkill: {
    findFirst: mocks.memberSkillFindFirst,
    create: mocks.memberSkillCreate,
    update: mocks.memberSkillUpdate
  },
  skillLevelChange: { create: mocks.skillLevelChangeCreate },
  auditLog: {
    create: mocks.auditLogCreate,
    createMany: mocks.auditLogCreateMany
  }
};

describe("updateMember audit log", () => {
  const before = {
    id: "member-1",
    employeeNo: "E001",
    name: "変更前",
    email: "member@example.com",
    departmentId: "department-1",
    jobTitle: "Engineer",
    profile: "変更前プロフィール",
    status: "ACTIVE"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.memberFindUniqueOrThrow.mockResolvedValue(before);
    mocks.userFindFirst.mockResolvedValue(null);
    mocks.userUpdate.mockResolvedValue({});
    mocks.userCreate.mockResolvedValue({});
    mocks.memberCount.mockResolvedValue(0);
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("records changed field names without storing profile values or platform-owned fields", async () => {
    mocks.memberUpdate.mockResolvedValue({
      ...before,
      name: "変更後",
      profile: "変更後プロフィール"
    });

    await updateMember("member-1", {
      employeeNo: "E001",
      name: "変更後",
      email: "member@example.com",
      departmentId: "department-1",
      jobTitle: "Engineer",
      profile: "変更後プロフィール",
      status: "ACTIVE"
    }, "actor-1");

    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorMemberId: "actor-1",
        action: "member.update",
        targetType: "Member",
        targetId: "member-1",
        before: {},
        after: {},
        metadata: { changedFields: ["profile"] }
      })
    });
    expect(mocks.auditLogCreate.mock.calls[0][0].data.before).not.toHaveProperty("profile");
    expect(mocks.auditLogCreate.mock.calls[0][0].data.after).not.toHaveProperty("profile");
  });

  it("does not record an audit log when nothing changed", async () => {
    mocks.memberUpdate.mockResolvedValue(before);

    await updateMember("member-1", {
      employeeNo: "E001",
      name: "変更前",
      email: "member@example.com",
      departmentId: "department-1",
      jobTitle: "Engineer",
      profile: "変更前プロフィール",
      status: "ACTIVE"
    }, "actor-1");

    expect(mocks.auditLogCreate).not.toHaveBeenCalled();
  });

});

describe("createSkillAssessments transaction boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.memberFindUniqueOrThrow.mockResolvedValue({
      name: "テスト太郎"
    });
    mocks.memberFindUniqueOrThrowOutsideTransaction.mockResolvedValue({
      platformUserId: "applicant-platform-id"
    });
    mocks.getDirectLeaderIds.mockResolvedValue(["manager-platform-id"]);
    mocks.getUsers.mockResolvedValue(new Map([
      ["manager-platform-id", { id: "manager-platform-id", role: "MEMBER" }]
    ]));
    mocks.getOrganization.mockResolvedValue({
      nodes: [],
      members: new Map([
        ["manager-platform-id", { id: "manager-platform-id", role: "MEMBER" }]
      ])
    });
    mocks.ensureScopeMembers.mockResolvedValue([{ id: "manager-1" }]);
    // 申請したスキルだけを返す（件数が合わないと無効なスキルとして扱われる）
    mocks.skillFindMany.mockImplementation(({ where }) =>
      Promise.resolve(
        [
          { id: "skill-1", name: "React" },
          { id: "skill-2", name: "TypeScript" },
          { id: "skill-3", name: "設計" }
        ].filter((skill) => where.id.in.includes(skill.id))
      )
    );
    mocks.assessmentFindMany.mockResolvedValue([]);
    mocks.assessmentCreate.mockImplementation(({ data }) => {
      const assessmentNumber = data.skillId.replace("skill-", "");
      return Promise.resolve({
        id: `assessment-${assessmentNumber}`,
        ...data
      });
    });
    mocks.notificationCreateMany.mockResolvedValue({ count: 1 });
  });

  it("creates one notification for the manager with the batch summary", async () => {
    const result = await createSkillAssessments({
      memberId: "member-1",
      assessments: [
        { skillId: "skill-1", requestedLevel: 3 },
        { skillId: "skill-2", requestedLevel: 4 },
        { skillId: "skill-3", requestedLevel: 2 }
      ]
    }, null);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.assessmentCreate).toHaveBeenCalledTimes(3);
    expect(mocks.notificationCreateMany).toHaveBeenCalledWith({
      data: [
        {
          skillSelfAssessmentId: "assessment-1",
          recipientMemberId: "manager-1",
          actorMemberId: "member-1",
          type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
          title: "スキル申請の承認依頼",
          body: "3件の申請が届きました（React Lv3・TypeScript Lv4 ほか）。"
        }
      ]
    });
    expect(result).toHaveLength(3);
  });

  it("falls back to active admins when the member has no manager user", async () => {
    mocks.getDirectLeaderIds.mockResolvedValue([]);
    mocks.getOrganization.mockResolvedValue({
      nodes: [],
      members: new Map([
        ["admin-platform-1", { id: "admin-platform-1", role: "ADMIN" }],
        ["admin-platform-2", { id: "admin-platform-2", role: "ADMIN" }]
      ])
    });
    mocks.ensureScopeMembers.mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]);
    mocks.skillFindMany.mockResolvedValue([{ id: "skill-1", name: "React" }]);

    await createSkillAssessments({
      memberId: "member-1",
      assessments: [{ skillId: "skill-1", requestedLevel: 3 }]
    }, null);

    expect(mocks.getOrganization).toHaveBeenCalledWith("applicant-platform-id");
    expect(mocks.notificationCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          recipientMemberId: "admin-1",
          actorMemberId: "member-1",
          body: "React Lv3 の申請が届きました。"
        }),
        expect.objectContaining({
          recipientMemberId: "admin-2",
          actorMemberId: "member-1",
          body: "React Lv3 の申請が届きました。"
        })
      ]
    });
  });

  it("rejects the transaction when notification creation fails", async () => {
    mocks.notificationCreateMany.mockRejectedValueOnce(new Error("notification failed"));

    await expect(
      createSkillAssessments({
        memberId: "member-1",
        assessments: [
          { skillId: "skill-1", requestedLevel: 3 },
          { skillId: "skill-2", requestedLevel: 4 }
        ]
      }, null)
    ).rejects.toThrow("notification failed");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.assessmentCreate).toHaveBeenCalledTimes(2);
  });
});

describe("approveSkillAssessments transaction boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.assessmentFindUnique.mockImplementation(({ where: { id } }) =>
      Promise.resolve({
        id,
        memberId: `member-${id}`,
        skillId: `skill-${id}`,
        requestedLevel: 3,
        yearsOfExperience: null,
        status: SkillSelfAssessmentStatus.PENDING,
        member: { name: `申請者${id}`, managerId: "manager-1" },
        skill: { name: `スキル${id}` }
      })
    );
    mocks.memberSkillFindFirst.mockResolvedValue(null);
    mocks.memberSkillCreate.mockResolvedValue({});
    mocks.skillLevelChangeCreate.mockResolvedValue({});
    mocks.assessmentUpdate.mockImplementation(({ where: { id }, data }) =>
      Promise.resolve({ id, ...data })
    );
    mocks.assessmentCount.mockResolvedValue(0);
    mocks.notificationCreate.mockResolvedValue({});
    mocks.notificationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("approves every selected assessment through one transaction", async () => {
    const result = await approveSkillAssessments({
      assessmentIds: ["assessment-1", "assessment-2"],
      reviewerMemberId: "manager-1",
      reviewerRole: "MANAGER"
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.assessmentFindUnique).toHaveBeenCalledTimes(2);
    expect(mocks.memberSkillCreate).toHaveBeenCalledTimes(2);
    expect(mocks.skillLevelChangeCreate).toHaveBeenCalledTimes(2);
    expect(mocks.notificationCreate).toHaveBeenCalledTimes(2);
    expect(mocks.notificationUpdateMany).toHaveBeenCalledTimes(2);
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(2);
    expect(mocks.auditLogCreate).toHaveBeenNthCalledWith(
      1,
      { data: expect.objectContaining({ targetId: "assessment-1" }) }
    );
    expect(mocks.auditLogCreate).toHaveBeenNthCalledWith(
      2,
      { data: expect.objectContaining({ targetId: "assessment-2" }) }
    );
    expect(result).toHaveLength(2);
  });

  it("marks assessment request notifications as read when no pending assessment remains", async () => {
    await approveSkillAssessments({
      assessmentIds: ["assessment-1"],
      reviewerMemberId: "manager-1",
      reviewerRole: "MANAGER"
    });

    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith({
      where: {
        type: NotificationType.SKILL_ASSESSMENT_REQUESTED,
        status: NotificationStatus.UNREAD,
        skillSelfAssessment: { memberId: "member-assessment-1" }
      },
      data: {
        status: NotificationStatus.READ,
        readAt: expect.any(Date)
      }
    });
  });

  it("keeps assessment request notifications unread while pending assessments remain", async () => {
    mocks.assessmentCount.mockResolvedValue(1);

    await approveSkillAssessments({
      assessmentIds: ["assessment-1"],
      reviewerMemberId: "manager-1",
      reviewerRole: "MANAGER"
    });

    expect(mocks.notificationUpdateMany).not.toHaveBeenCalled();
  });

});

describe("buildMemberSearchWhere", () => {
  it("combines skill and minimum level in the same relation condition", () => {
    expect(
      buildMemberSearchWhere({
        skillId: "skill-1",
        minLevel: 3,
        status: "ACTIVE"
      })
    ).toEqual({
      status: "ACTIVE",
      memberSkills: {
        some: {
          skillId: "skill-1",
          level: { gte: 3 }
        }
      }
    });
  });

  it("does not add conditions when no filter is supplied", () => {
    expect(buildMemberSearchWhere()).toEqual({});
  });
});
