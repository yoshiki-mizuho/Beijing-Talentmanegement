import {
  NotificationType,
  SkillLevelChangeSource,
  SkillSelfAssessmentStatus
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  memberSkillFind: vi.fn(),
  memberSkillUpsert: vi.fn(),
  levelChangeCreate: vi.fn(),
  assessmentFind: vi.fn(),
  assessmentUpdate: vi.fn(),
  notificationCreate: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: mocks.transaction }
}));

import {
  reviewSkillAssessment,
  upsertMemberSkill
} from "@/modules/members/infrastructure/member-repository";

const transactionClient = {
  memberSkill: {
    findUnique: mocks.memberSkillFind,
    upsert: mocks.memberSkillUpsert
  },
  skillLevelChange: { create: mocks.levelChangeCreate },
  skillSelfAssessment: {
    findUnique: mocks.assessmentFind,
    update: mocks.assessmentUpdate
  },
  notification: { create: mocks.notificationCreate }
};

describe("member skill level change recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.memberSkillUpsert.mockResolvedValue({ id: "member-skill" });
    mocks.levelChangeCreate.mockResolvedValue({ id: "change" });
  });

  it("records a direct edit in the member-skill transaction", async () => {
    mocks.memberSkillFind.mockResolvedValue({ level: 2 });

    await upsertMemberSkill({
      memberId: "member-1",
      skillId: "skill-1",
      level: 3,
      changedByMemberId: "manager-1"
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.levelChangeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromLevel: 2,
        toLevel: 3,
        source: SkillLevelChangeSource.DIRECT_EDIT,
        changedByMemberId: "manager-1"
      })
    });
  });

  it("does not record a direct edit when the level is unchanged", async () => {
    mocks.memberSkillFind.mockResolvedValue({ level: 3 });

    await upsertMemberSkill({
      memberId: "member-1",
      skillId: "skill-1",
      level: 3,
      changedByMemberId: "manager-1"
    });

    expect(mocks.levelChangeCreate).not.toHaveBeenCalled();
  });

  it("keeps the requested level and records a corrected approval", async () => {
    mocks.assessmentFind.mockResolvedValue({
      id: "assessment-1",
      memberId: "member-1",
      skillId: "skill-1",
      requestedLevel: 4,
      yearsOfExperience: null,
      status: SkillSelfAssessmentStatus.PENDING,
      member: { managerId: "manager-1" },
      skill: { name: "TypeScript" }
    });
    mocks.memberSkillFind.mockResolvedValue({ level: 2 });
    mocks.assessmentUpdate.mockResolvedValue({ id: "assessment-1" });
    mocks.notificationCreate.mockResolvedValue({ id: "notification-1" });

    await reviewSkillAssessment({
      assessmentId: "assessment-1",
      reviewerMemberId: "manager-1",
      reviewerRole: "MANAGER",
      status: SkillSelfAssessmentStatus.CORRECTED,
      correctedLevel: 3
    });

    expect(mocks.assessmentUpdate).toHaveBeenCalledWith({
      where: { id: "assessment-1" },
      data: expect.not.objectContaining({ requestedLevel: expect.anything() })
    });
    expect(mocks.levelChangeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromLevel: 2,
        toLevel: 3,
        source: SkillLevelChangeSource.ASSESSMENT_CORRECTED,
        skillSelfAssessmentId: "assessment-1"
      })
    });
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: NotificationType.SKILL_ASSESSMENT_CORRECTED,
        body: "TypeScript の申告が Lv3 に補正して承認されました。"
      })
    });
  });
});
