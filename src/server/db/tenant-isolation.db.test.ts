import { afterAll, describe, expect, it } from "vitest";

import { prisma, runWithTenant } from "./prisma";

const tenantA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tenantB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const prefix = `DB-RLS-${Date.now()}`;
let categoryId = "";
let aiJobId = "";
let memberId = "";

describe("tenant row-level isolation", () => {
  it("hides tenant A rows from tenant B for list, ID, and count queries", async () => {
    const category = await runWithTenant(tenantA, () =>
      prisma.skillCategory.create({ data: { name: prefix } }),
    );
    categoryId = category.id;
    await runWithTenant(tenantB, async () => {
      await expect(prisma.skillCategory.findMany({ where: { id: categoryId } })).resolves.toEqual([]);
      await expect(prisma.skillCategory.findUnique({ where: { id: categoryId } })).resolves.toBeNull();
      await expect(prisma.skillCategory.count({ where: { id: categoryId } })).resolves.toBe(0);
    });
  });

  it("cannot update or delete another tenant row", async () => {
    await runWithTenant(tenantB, async () => {
      await expect(prisma.skillCategory.updateMany({
        where: { id: categoryId },
        data: { name: `${prefix}-changed` },
      })).resolves.toEqual({ count: 0 });
      await expect(prisma.skillCategory.deleteMany({ where: { id: categoryId } })).resolves.toEqual({ count: 0 });
    });
  });

  it("rejects an explicit tenant ID that violates WITH CHECK", async () => {
    await expect(runWithTenant(tenantB, () =>
      prisma.skillCategory.create({ data: { tenantId: tenantA, name: `${prefix}-check` } }),
    )).rejects.toThrow();
  });

  it("rejects database access without a tenant", async () => {
    await expect(prisma.skillCategory.findMany()).rejects.toThrow("A tenant ID is required");
  });

  it("applies the tenant inside an interactive transaction", async () => {
    await runWithTenant(tenantB, () =>
      prisma.$transaction(async (transaction) => {
        await expect(transaction.skillCategory.findMany({ where: { id: categoryId } })).resolves.toEqual([]);
      }),
    );
  });

  it("allows the same business key in different tenants", async () => {
    const category = await runWithTenant(tenantB, () =>
      prisma.skillCategory.create({ data: { name: prefix } }),
    );
    await runWithTenant(tenantB, () =>
      prisma.skillCategory.delete({ where: { id: category.id } }),
    );
  });

  it("hides AiJob rows from another tenant", async () => {
    const created = await runWithTenant(tenantA, async () => {
      const member = await prisma.member.create({
        data: { platformUserId: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001" },
      });
      memberId = member.id;
      return prisma.aiJob.create({
        data: {
          kind: "GROWTH_HINT",
          targetMemberId: member.id,
          requestedByMemberId: member.id,
          params: {},
        },
      });
    });
    aiJobId = created.id;
    await runWithTenant(tenantB, async () => {
      await expect(prisma.aiJob.findUnique({ where: { id: aiJobId } })).resolves.toBeNull();
    });
  });

  it("reads HubTenant without tenant context because it has no RLS", async () => {
    await prisma.hubTenant.upsert({
      where: { id: tenantA },
      create: { id: tenantA },
      update: { lastSeenAt: new Date() },
    });
    await expect(prisma.hubTenant.findUnique({ where: { id: tenantA } }))
      .resolves.toMatchObject({ id: tenantA });
  });
});

afterAll(async () => {
  if (categoryId) {
    await runWithTenant(tenantA, () =>
      prisma.skillCategory.deleteMany({ where: { id: categoryId } }),
    );
  }
  if (memberId) {
    await runWithTenant(tenantA, () =>
      prisma.member.deleteMany({ where: { id: memberId } }),
    );
  }
  await prisma.hubTenant.deleteMany({ where: { id: tenantA } });
  await prisma.$disconnect();
});
