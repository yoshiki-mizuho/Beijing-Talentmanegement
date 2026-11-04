import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  skillCreate: vi.fn(),
  skillFindFirst: vi.fn(),
  skillUpdate: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryUpdate: vi.fn(),
  levelGuideCreateMany: vi.fn(),
  skillFindMany: vi.fn(),
  memberFindUnique: vi.fn(),
  memberSkillCount: vi.fn(),
  assessmentCount: vi.fn(),
  levelChangeCount: vi.fn(),
  cheerCount: vi.fn(),
  requirementCount: vi.fn(),
  prerequisiteCount: vi.fn(),
  skillDelete: vi.fn(),
  skillLevelFindMany: vi.fn(),
  skillLevelUpdate: vi.fn(),
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
  createSkillWithLevelGuides,
  deleteSkill,
  listPopularSkillsForMember,
  reorderSkills,
  updateCommonSkillLevelGuides
} from "@/modules/skills/infrastructure/skill-repository";

const transactionClient = {
  memberSkill: { count: mocks.memberSkillCount },
  skillSelfAssessment: { count: mocks.assessmentCount },
  skillLevelChange: { count: mocks.levelChangeCount },
  cheer: { count: mocks.cheerCount },
  roleRequirement: { count: mocks.requirementCount },
  skillPrerequisite: { count: mocks.prerequisiteCount },
  skill: {
    create: mocks.skillCreate,
    findFirst: mocks.skillFindFirst,
    findMany: mocks.skillFindMany,
    update: mocks.skillUpdate,
    delete: mocks.skillDelete
  },
  skillCategory: {
    findMany: mocks.categoryFindMany,
    update: mocks.categoryUpdate
  },
  skillLevelGuide: { createMany: mocks.levelGuideCreateMany },
  skillLevel: {
    findMany: mocks.skillLevelFindMany,
    update: mocks.skillLevelUpdate
  },
  auditLog: { create: mocks.auditLogCreate }
};

describe("updateCommonSkillLevelGuides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((callback) => callback(transactionClient));
    mocks.skillLevelFindMany.mockResolvedValue(
      [1, 2, 3, 4, 5].map((level) => ({ level, description: `変更前${level}` }))
    );
    mocks.skillLevelUpdate.mockImplementation(({ where, data }) =>
      Promise.resolve({ level: where.level, description: data.description })
    );
  });

  it("5件を同じトランザクションで更新し、監査ログを1件残す", async () => {
    const guides = [1, 2, 3, 4, 5].map((level) => ({
      level,
      description: `変更後${level}`
    }));

    await updateCommonSkillLevelGuides({ guides }, "admin-1");

    expect(mocks.skillLevelUpdate).toHaveBeenCalledTimes(5);
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorMemberId: "admin-1",
        action: "skill.level_guides.update",
        targetId: "common-skill-level-guides"
      })
    });
  });
});

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
    mocks.skillFindFirst.mockResolvedValue(null);
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
        displayOrder: 0,
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

  it("空欄を除いたレベルの目安をスキルと同時に登録する", async () => {
    mocks.skillCreate.mockResolvedValue({
      id: "skill-2",
      code: "SKILL-0002",
      name: "システム設計",
      categoryId: "category-1",
      description: null,
      isActive: true
    });

    await createSkillWithLevelGuides(
      { name: "システム設計", categoryId: "category-1", isActive: true },
      {
        guides: [
          { level: 1, description: "基礎を理解している" },
          { level: 2, description: "" },
          { level: 3, description: "一人で設計できる" },
          { level: 4, description: "" },
          { level: 5, description: "" }
        ]
      },
      "actor-1"
    );

    expect(mocks.levelGuideCreateMany).toHaveBeenCalledWith({
      data: [
        { skillId: "skill-2", level: 1, description: "基礎を理解している" },
        { skillId: "skill-2", level: 3, description: "一人で設計できる" }
      ]
    });
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(2);
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

  it("前提スキルの関係があっても削除できる", async () => {
    mocks.prerequisiteCount.mockResolvedValue(1);

    await deleteSkill("skill-1", "actor-1");

    expect(mocks.prerequisiteCount).not.toHaveBeenCalled();
    expect(mocks.skillDelete).toHaveBeenCalledWith({
      where: { id: "skill-1" }
    });
  });
});

describe("reorderSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.categoryFindMany.mockResolvedValue([
      { id: "category-1", displayOrder: 0 },
      { id: "category-2", displayOrder: 1 }
    ]);
    mocks.skillFindMany.mockResolvedValue([
      { id: "skill-1", categoryId: "category-1", displayOrder: 0, code: "S1", name: "A", description: null, isActive: true },
      { id: "skill-2", categoryId: "category-2", displayOrder: 0, code: "S2", name: "B", description: null, isActive: true }
    ]);
    mocks.categoryUpdate.mockResolvedValue({});
    mocks.skillUpdate.mockResolvedValue({});
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("変更された行だけを更新し、移動と並び替えを監査ログへ記録する", async () => {
    await expect(reorderSkills({
      categories: [
        { categoryId: "category-2", skillIds: ["skill-2", "skill-1"] },
        { categoryId: "category-1", skillIds: [] }
      ]
    }, "actor-1")).resolves.toEqual({
      changedCategoryCount: 2,
      changedSkillCount: 1,
      movedSkillCount: 1
    });

    expect(mocks.categoryUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.skillUpdate).toHaveBeenCalledOnce();
    expect(mocks.skillUpdate).toHaveBeenCalledWith({
      where: { id: "skill-1" },
      data: { categoryId: "category-2", displayOrder: 1 }
    });
    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "skill.reorder",
        metadata: {
          changedCategoryCount: 2,
          changedSkillCount: 1,
          movedSkillCount: 1
        }
      })
    });
  });

  it.each([
    { categories: [{ categoryId: "category-1", skillIds: ["skill-1", "skill-2"] }] },
    { categories: [
      { categoryId: "category-1", skillIds: ["skill-1", "skill-1"] },
      { categoryId: "category-2", skillIds: [] }
    ] }
  ])("不足または重複した一覧を拒否する", async (input) => {
    await expect(reorderSkills(input, null)).rejects.toThrow(
      "一覧が更新されています。画面を開き直してください。"
    );
  });
});
