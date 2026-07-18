import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  memberFindUniqueOrThrow: vi.fn(),
  skillFindMany: vi.fn(),
  assessmentFindMany: vi.fn(),
  assessmentCreate: vi.fn(),
  userFindMany: vi.fn(),
  notificationCreateMany: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction
  }
}));

import {
  buildMemberSearchWhere,
  createSkillAssessments
} from "@/modules/members/infrastructure/member-repository";

const transactionClient = {
  member: { findUniqueOrThrow: mocks.memberFindUniqueOrThrow },
  skill: { findMany: mocks.skillFindMany },
  skillSelfAssessment: {
    findMany: mocks.assessmentFindMany,
    create: mocks.assessmentCreate
  },
  user: { findMany: mocks.userFindMany },
  notification: { createMany: mocks.notificationCreateMany }
};

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
    });

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
      })
    ).rejects.toThrow("notification failed");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.assessmentCreate).toHaveBeenCalledTimes(2);
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
