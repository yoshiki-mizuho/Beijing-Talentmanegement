import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillSelfAssessmentStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  memberFindUniqueOrThrow: vi.fn(),
  memberUpdate: vi.fn(),
  skillFindMany: vi.fn(),
  assessmentFindMany: vi.fn(),
  assessmentFindUnique: vi.fn(),
  assessmentCreate: vi.fn(),
  assessmentUpdate: vi.fn(),
  userFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
  notificationCreate: vi.fn(),
  memberSkillFindUnique: vi.fn(),
  memberSkillUpsert: vi.fn(),
  skillLevelChangeCreate: vi.fn(),
  auditLogCreate: vi.fn(),
  auditLogCreateMany: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction
  }
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
    update: mocks.memberUpdate
  },
  skill: { findMany: mocks.skillFindMany },
  skillSelfAssessment: {
    findMany: mocks.assessmentFindMany,
    findUnique: mocks.assessmentFindUnique,
    update: mocks.assessmentUpdate,
    create: mocks.assessmentCreate
  },
  user: { findMany: mocks.userFindMany },
  notification: {
    createMany: mocks.notificationCreateMany,
    create: mocks.notificationCreate
  },
  memberSkill: {
    findUnique: mocks.memberSkillFindUnique,
    upsert: mocks.memberSkillUpsert
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
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("records only changed fields and redacts the profile value", async () => {
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
        before: { name: "変更前" },
        after: { name: "変更後" }
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
    mocks.memberFindUniqueOrThrow.mockResolvedValue({ name: "テスト太郎" });
    mocks.skillFindMany.mockResolvedValue([
      { id: "skill-1", name: "TypeScript" },
      { id: "skill-2", name: "設計" }
    ]);
    mocks.assessmentFindMany.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue([{ memberId: "manager-1" }]);
    mocks.assessmentCreate
      .mockResolvedValueOnce({
        id: "assessment-1",
        skillId: "skill-1",
        requestedLevel: 3
      })
      .mockResolvedValueOnce({
        id: "assessment-2",
        skillId: "skill-2",
        requestedLevel: 4
      });
    mocks.notificationCreateMany.mockResolvedValue({ count: 2 });
  });

  it("creates every assessment and notification in one transaction", async () => {
    const result = await createSkillAssessments({
      memberId: "member-1",
      assessments: [
        { skillId: "skill-1", requestedLevel: 3 },
        { skillId: "skill-2", requestedLevel: 4 }
      ]
    }, null);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.assessmentCreate).toHaveBeenCalledTimes(2);
    expect(mocks.notificationCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          skillSelfAssessmentId: "assessment-1",
          recipientMemberId: "manager-1"
        }),
        expect.objectContaining({
          skillSelfAssessmentId: "assessment-2",
          recipientMemberId: "manager-1"
        })
      ])
    });
    expect(result).toHaveLength(2);
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
    mocks.memberSkillFindUnique.mockResolvedValue(null);
    mocks.memberSkillUpsert.mockResolvedValue({});
    mocks.skillLevelChangeCreate.mockResolvedValue({});
    mocks.assessmentUpdate.mockImplementation(({ where: { id }, data }) =>
      Promise.resolve({ id, ...data })
    );
    mocks.notificationCreate.mockResolvedValue({});
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
    expect(mocks.memberSkillUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.skillLevelChangeCreate).toHaveBeenCalledTimes(2);
    expect(mocks.notificationCreate).toHaveBeenCalledTimes(2);
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

  it("identifies the out-of-scope assessment and rejects the transaction", async () => {
    mocks.assessmentFindUnique
      .mockResolvedValueOnce({
        id: "assessment-1",
        memberId: "member-1",
        skillId: "skill-1",
        requestedLevel: 3,
        yearsOfExperience: null,
        status: SkillSelfAssessmentStatus.PENDING,
        member: { name: "申請者1", managerId: "manager-1" },
        skill: { name: "スキル1" }
      })
      .mockResolvedValueOnce({
        id: "assessment-2",
        memberId: "member-2",
        skillId: "skill-2",
        requestedLevel: 4,
        yearsOfExperience: null,
        status: SkillSelfAssessmentStatus.PENDING,
        member: { name: "申請者2", managerId: "other-manager" },
        skill: { name: "スキル2" }
      });

    await expect(
      approveSkillAssessments({
        assessmentIds: ["assessment-1", "assessment-2"],
        reviewerMemberId: "manager-1",
        reviewerRole: "MANAGER"
      })
    ).rejects.toThrow(
      "申請者2 / スキル2（申請ID: assessment-2）を承認する権限がありません。"
    );

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});

describe("buildMemberSearchWhere", () => {
  it("builds keyword and department conditions together", () => {
    expect(
      buildMemberSearchWhere({ q: "佐藤", departmentId: "department-1" })
    ).toEqual({
      OR: [
        { employeeNo: { contains: "佐藤", mode: "insensitive" } },
        { name: { contains: "佐藤", mode: "insensitive" } },
        { email: { contains: "佐藤", mode: "insensitive" } },
        { jobTitle: { contains: "佐藤", mode: "insensitive" } }
      ],
      departmentId: "department-1"
    });
  });

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
