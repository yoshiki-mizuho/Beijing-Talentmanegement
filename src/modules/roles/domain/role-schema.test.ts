import { describe, expect, it } from "vitest";

import {
  roleInputSchema,
  roleRequirementInputSchema
} from "@/modules/roles/domain/role-schema";

describe("role schemas", () => {
  it("accepts valid role input", () => {
    expect(
      roleInputSchema.parse({
        name: "Tech Lead",
        description: "Leads technical delivery",
        isActive: true
      })
    ).toMatchObject({
      name: "Tech Lead",
      isActive: true
    });
  });

  it("rejects role requirement levels outside 1 to 5", () => {
    expect(() =>
      roleRequirementInputSchema.parse({
        roleId: "role-1",
        skillId: "skill-1",
        requiredLevel: 9,
        isRequired: true
      })
    ).toThrow();
  });

  it("defaults role requirements to required", () => {
    expect(
      roleRequirementInputSchema.parse({
        roleId: "role-1",
        skillId: "skill-1",
        requiredLevel: 3
      }).isRequired
    ).toBe(true);
  });

  it("accepts optional role requirements", () => {
    expect(
      roleRequirementInputSchema.parse({
        roleId: "role-1",
        skillId: "skill-1",
        requiredLevel: 3,
        isRequired: false
      }).isRequired
    ).toBe(false);
  });
});
