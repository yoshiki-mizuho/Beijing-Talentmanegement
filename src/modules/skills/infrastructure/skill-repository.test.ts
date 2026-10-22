import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  skillCreate: vi.fn(),
  skillFindMany: vi.fn(),
  memberFindUnique: vi.fn(),
  memberSkillCount: vi.fn(),
  assessmentCount: vi.fn(),
  levelChangeCount: vi.fn(),
  cheerCount: vi.fn(),
  requirementCount: vi.fn(),
  skillDelete: vi.fn(),
  auditLogCreate: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    member: { findUnique: mocks.memberFindUnique },
    skill: { findMany: mocks.skillFindMany }
  }
}));

import { SkillNameConflictError } from "@/modules/skills/domain/skill-errors";
import {
  createSkill,
  deleteSkill,
  listPopularSkillsForMember
} from "@/modules/skills/infrastructure/skill-repository";

const transactionClient = {
  memberSkill: { count: mocks.memberSkillCount },
  skillSelfAssessment: { count: mocks.assessmentCount },
  skillLevelChange: { count: mocks.levelChangeCount },
  cheer: { count: mocks.cheerCount },
  roleRequirement: { count: mocks.requirementCount },
  skill: {
    create: mocks.skillCreate,
    findMany: mocks.skillFindMany,
    delete: mocks.skillDelete
  },
  auditLog: { create: mocks.auditLogCreate }
};

describe("listPopularSkillsForMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memberFindUnique.mockResolvedValue({
      departmentId: "department-1",
      department: { name: "開発部" }
    });
  });

  it("部署の登録が3件以上なら件数順、同数は名前順で上位8件を返す", async () => {
    mocks.skillFindMany.mockResolvedValue([
      { id: "skill-b", name: "設計", _count: { memberSkills: 2 } },
      { id: "skill-a", name: "React", _count: { memberSkills: 1 } }
    ]);

    await expect(listPopularSkillsForMember("member-1")).resolves.toEqual({
      departmentName: "開発部",
      skillIds: ["skill-b", "skill-a"]
    });
    expect(mocks.skillFindMany).toHaveBeenCalledTimes(1);
  });

  it("部署の登録が3件未満なら全社の集計へ切り替える", async () => {
    mocks.skillFindMany
      .mockResolvedValueOnce([
        { id: "skill-a", name: "React", _count: { memberSkills: 2 } }
      ])
      .mockResolvedValueOnce([
        { id: "skill-c", name: "AWS", _count: { memberSkills: 4 } },
        { id: "skill-b", name: "設計", _count: { memberSkills: 4 } }
      ]);

    await expect(listPopularSkillsForMember("member-1")).resolves.toEqual({
      departmentName: null,
      skillIds: ["skill-c", "skill-b"]
    });
  });
});

describe("createSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.skillFindMany.mockResolvedValue([{ code: "SKILL-0001" }]);
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("自動採番したコードでスキルと監査ログを登録する", async () => {
    mocks.skillCreate.mockResolvedValue({
      id: "skill-2",
      code: "SKILL-0002",
      name: "システム設計",
      categoryId: "category-1",
      description: null,
      isActive: true
    });

    await createSkill({
      name: "システム設計",
      categoryId: "category-1",
      isActive: true
    }, "actor-1");

    expect(mocks.skillCreate).toHaveBeenCalledWith({
      data: {
        name: "システム設計",
        categoryId: "category-1",
        isActive: true,
        code: "SKILL-0002"
      }
    });
    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorMemberId: "actor-1",
        action: "skill.create",
        targetId: "skill-2",
        after: {
          code: "SKILL-0002",
          name: "システム設計",
          categoryId: "category-1",
          description: null,
          isActive: true
        }
      })
    });
  });

  it("コード競合時は再採番して登録を再試行する", async () => {
    mocks.skillFindMany
      .mockResolvedValueOnce([{ code: "SKILL-0001" }])
      .mockResolvedValueOnce([{ code: "SKILL-0001" }, { code: "SKILL-0002" }]);
    mocks.skillCreate
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["code"] } })
      .mockResolvedValueOnce({
        id: "skill-3",
        code: "SKILL-0003",
        name: "テスト設計",
        categoryId: "category-1",
        description: null,
        isActive: true
      });

    await expect(createSkill({
      name: "テスト設計",
      categoryId: "category-1",
      isActive: true
    }, null)).resolves.toEqual(expect.objectContaining({ code: "SKILL-0003" }));

    expect(mocks.skillCreate).toHaveBeenCalledTimes(2);
  });

  it("名称の一意制約違反は業務エラーへ変換する", async () => {
    mocks.skillCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["categoryId", "name"] }
    });

    await expect(createSkill({
      name: "既存スキル",
      categoryId: "category-1",
      isActive: true
    }, null)).rejects.toBeInstanceOf(SkillNameConflictError);
  });
});

describe("deleteSkill audit log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    for (const count of [
      mocks.memberSkillCount,
      mocks.assessmentCount,
      mocks.levelChangeCount,
      mocks.cheerCount,
      mocks.requirementCount
    ]) {
      count.mockResolvedValue(0);
    }
    mocks.skillDelete.mockResolvedValue({
      id: "skill-1",
      code: "SKILL-001",
      name: "TypeScript",
      categoryId: "category-1",
      description: "言語",
      isActive: true
    });
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("records the deleted skill snapshot in the same transaction", async () => {
    await deleteSkill("skill-1", "actor-1");

    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: {
        actorMemberId: "actor-1",
        action: "skill.delete",
        targetType: "Skill",
        targetId: "skill-1",
        before: {
          code: "SKILL-001",
          name: "TypeScript",
          categoryId: "category-1",
          description: "言語",
          isActive: true
        }
      }
    });
  });
});
