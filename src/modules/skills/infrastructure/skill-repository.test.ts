import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  skillCreate: vi.fn(),
  skillFindMany: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    skill: {
      create: mocks.skillCreate,
      findMany: mocks.skillFindMany
    }
  }
}));

import { SkillNameConflictError } from "@/modules/skills/domain/skill-errors";
import { createSkill } from "@/modules/skills/infrastructure/skill-repository";

describe("createSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.skillFindMany.mockResolvedValue([{ code: "SKILL-0001" }]);
  });

  it("自動採番したコードでスキルを登録する", async () => {
    mocks.skillCreate.mockResolvedValue({ id: "skill-2", code: "SKILL-0002" });

    await createSkill({
      name: "システム設計",
      categoryId: "category-1",
      isActive: true
    });

    expect(mocks.skillCreate).toHaveBeenCalledWith({
      data: {
        name: "システム設計",
        categoryId: "category-1",
        isActive: true,
        code: "SKILL-0002"
      }
    });
  });

  it("コード競合時は再採番して登録を再試行する", async () => {
    mocks.skillFindMany
      .mockResolvedValueOnce([{ code: "SKILL-0001" }])
      .mockResolvedValueOnce([
        { code: "SKILL-0001" },
        { code: "SKILL-0002" }
      ]);
    mocks.skillCreate
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["code"] } })
      .mockResolvedValueOnce({ id: "skill-3", code: "SKILL-0003" });

    await expect(
      createSkill({
        name: "テスト設計",
        categoryId: "category-1",
        isActive: true
      })
    ).resolves.toEqual({ id: "skill-3", code: "SKILL-0003" });

    expect(mocks.skillCreate).toHaveBeenCalledTimes(2);
    expect(mocks.skillCreate).toHaveBeenLastCalledWith({
      data: {
        name: "テスト設計",
        categoryId: "category-1",
        isActive: true,
        code: "SKILL-0003"
      }
    });
  });

  it("名称の一意制約違反は業務エラーへ変換する", async () => {
    mocks.skillCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["categoryId", "name"] }
    });

    await expect(
      createSkill({
        name: "既存スキル",
        categoryId: "category-1",
        isActive: true
      })
    ).rejects.toBeInstanceOf(SkillNameConflictError);
  });
});