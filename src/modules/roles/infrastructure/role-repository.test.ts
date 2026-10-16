import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requirementFindUnique: vi.fn(),
  requirementUpsert: vi.fn(),
  auditLogCreate: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { upsertRoleRequirement } from "@/modules/roles/infrastructure/role-repository";

const transactionClient = {
  roleRequirement: {
    findUnique: mocks.requirementFindUnique,
    upsert: mocks.requirementUpsert,
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
        after: { requiredLevel: 3, isRequired: true },
      }),
    });
  });
});
