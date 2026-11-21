import { afterAll, describe, expect, it } from "vitest";

import { prisma, runWithTenant } from "./prisma";

const tenantA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tenantB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const prefix = `DB-RLS-${Date.now()}`;
let departmentId = "";

describe("tenant row-level isolation", () => {
  it("hides tenant A rows from tenant B for list, ID, and count queries", async () => {
    const department = await runWithTenant(tenantA, () =>
      prisma.department.create({
        data: { code: prefix, name: prefix }
      })
    );
    departmentId = department.id;

    await runWithTenant(tenantB, async () => {
      await expect(prisma.department.findMany({ where: { id: departmentId } }))
        .resolves.toEqual([]);
      await expect(prisma.department.findUnique({ where: { id: departmentId } }))
        .resolves.toBeNull();
      await expect(prisma.department.count({ where: { id: departmentId } }))
        .resolves.toBe(0);
    });
  });

  it("cannot update or delete another tenant row", async () => {
    await runWithTenant(tenantB, async () => {
      await expect(prisma.department.updateMany({
        where: { id: departmentId },
        data: { name: `${prefix}-changed` }
      })).resolves.toEqual({ count: 0 });
      await expect(prisma.department.deleteMany({ where: { id: departmentId } }))
        .resolves.toEqual({ count: 0 });
    });
  });

  it("rejects an explicit tenant ID that violates WITH CHECK", async () => {
    await expect(runWithTenant(tenantB, () =>
      prisma.department.create({
        data: {
          tenantId: tenantA,
          code: `${prefix}-check`,
          name: `${prefix}-check`
        }
      })
    )).rejects.toThrow();
  });

  it("rejects database access without a tenant", async () => {
    await expect(prisma.department.findMany()).rejects.toThrow(
      "A tenant ID is required"
    );
    await expect(prisma.department.create({
      data: { code: `${prefix}-missing`, name: `${prefix}-missing` }
    })).rejects.toThrow("A tenant ID is required");
  });

  it("applies the tenant inside an interactive transaction", async () => {
    await runWithTenant(tenantB, () =>
      prisma.$transaction(async (transaction) => {
        await expect(transaction.department.findMany({
          where: { id: departmentId }
        })).resolves.toEqual([]);
      })
    );
  });

  it("allows the same business key in different tenants", async () => {
    const tenantBDepartment = await runWithTenant(tenantB, () =>
      prisma.department.create({
        data: { code: prefix, name: prefix }
      })
    );

    await runWithTenant(tenantB, () =>
      prisma.department.delete({ where: { id: tenantBDepartment.id } })
    );
  });
});

afterAll(async () => {
  if (departmentId) {
    await runWithTenant(tenantA, () =>
      prisma.department.deleteMany({ where: { id: departmentId } })
    );
  }
  await prisma.$disconnect();
});
