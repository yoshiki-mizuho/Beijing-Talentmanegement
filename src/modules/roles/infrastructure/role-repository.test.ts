import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requirementFindUnique: vi.fn(),
  requirementUpsert: vi.fn(),
  requirementCreate: vi.fn(),
  requirementUpdate: vi.fn(),
  requirementDelete: vi.fn(),
  roleFindUniqueOrThrow: vi.fn(),
  roleUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import {
  updateRoleWithRequirements,
  upsertRoleRequirement,
} from "@/modules/roles/infrastructure/role-repository";

const transactionClient = {
  roleRequirement: {
    findUnique: mocks.requirementFindUnique,
    upsert: mocks.requirementUpsert,
    create: mocks.requirementCreate,
    update: mocks.requirementUpdate,
    delete: mocks.requirementDelete,
  },
  role: {
    findUniqueOrThrow: mocks.roleFindUniqueOrThrow,
    update: mocks.roleUpdate,
  },
  auditLog: { create: mocks.auditLogCreate },
};

describe("upsertRoleRequirement audit log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback(transactionClient),
    );
    mocks.requirementFindUnique.mockResolvedValue(null);
    mocks.requirementUpsert.mockResolvedValue({
      roleId: "role-1",
      skillId: "skill-1",
      requiredLevel: 3,
      isRequired: true,
      anyOfGroup: null,
    });
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("records a newly set role requirement", async () => {
    await upsertRoleRequirement(
      {
        roleId: "role-1",
        skillId: "skill-1",
        requiredLevel: 3,
        isRequired: true,
      },
      "actor-1",
    );

    expect(mocks.auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorMemberId: "actor-1",
        action: "role.requirement.set",
        targetType: "Role",
        targetId: "role-1",
        metadata: { skillId: "skill-1" },
        // 組に入っていない要件は、空の anyOfGroup を差分に含めない
        after: { requiredLevel: 3, isRequired: true },
      }),
    });
  });
});

describe("updateRoleWithRequirements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) =>
      callback(transactionClient),
    );
    mocks.roleFindUniqueOrThrow.mockResolvedValue({
      id: "role-1",
      name: "旧ロール",
      description: null,
      isActive: true,
      roleRequirements: [
        { roleId: "role-1", skillId: "remove", requiredLevel: 1, isRequired: true, anyOfGroup: null },
        { roleId: "role-1", skillId: "change", requiredLevel: 2, isRequired: true, anyOfGroup: null },
      ],
    });
    mocks.roleUpdate.mockResolvedValue({
      id: "role-1",
      name: "新ロール",
      description: "説明",
      isActive: true,
    });
    mocks.auditLogCreate.mockResolvedValue({});
  });

  it("追加、削除、レベル変更を同じトランザクションで反映する", async () => {
    await updateRoleWithRequirements(
      "role-1",
      { name: "新ロール", description: "説明", isActive: true },
      [
        { skillId: "change", requiredLevel: 4 },
        { skillId: "add", requiredLevel: 3 },
      ],
      "actor-1",
    );

    expect(mocks.requirementDelete).toHaveBeenCalledWith({
      where: { roleId_skillId: { roleId: "role-1", skillId: "remove" } },
    });
    expect(mocks.requirementUpdate).toHaveBeenCalledWith({
      where: { roleId_skillId: { roleId: "role-1", skillId: "change" } },
      data: { requiredLevel: 4, anyOfGroup: null },
    });
    expect(mocks.requirementCreate).toHaveBeenCalledWith({
      data: { roleId: "role-1", skillId: "add", requiredLevel: 3, anyOfGroup: null, isRequired: true },
    });
    expect(mocks.auditLogCreate).toHaveBeenCalledTimes(4);
  });

  it("任意の要件は、レベルが同じなら必須に変えず更新もしない", async () => {
    mocks.roleFindUniqueOrThrow.mockResolvedValue({
      id: "role-1",
      name: "新ロール",
      description: "説明",
      isActive: true,
      roleRequirements: [
        { roleId: "role-1", skillId: "optional", requiredLevel: 2, isRequired: false, anyOfGroup: null },
      ],
    });

    await updateRoleWithRequirements(
      "role-1",
      { name: "新ロール", description: "説明", isActive: true },
      [{ skillId: "optional", requiredLevel: 2 }],
      "actor-1",
    );

    expect(mocks.requirementUpdate).not.toHaveBeenCalled();
    expect(mocks.requirementDelete).not.toHaveBeenCalled();
    expect(mocks.requirementCreate).not.toHaveBeenCalled();
  });

  it("いずれかの組を保存し、組の変更を監査する", async () => {
    await updateRoleWithRequirements(
      "role-1",
      { name: "新ロール", description: "説明", isActive: true },
      [
        { skillId: "change", requiredLevel: 2, anyOfGroup: 1 },
        { skillId: "add", requiredLevel: 3, anyOfGroup: 1 },
      ],
      "actor-1",
    );

    expect(mocks.requirementUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { requiredLevel: 2, anyOfGroup: 1 },
    }));
    expect(mocks.requirementCreate).toHaveBeenCalledWith({
      data: { roleId: "role-1", skillId: "add", requiredLevel: 3, anyOfGroup: 1, isRequired: true },
    });
  });
});
