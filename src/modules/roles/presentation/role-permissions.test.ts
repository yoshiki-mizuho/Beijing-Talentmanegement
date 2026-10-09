import { describe, expect, it } from "vitest";

import { canManageRoles } from "@/modules/roles/presentation/role-permissions";

describe("canManageRoles", () => {
  it.each([
    ["ADMIN", true],
    ["MANAGER", false],
    ["MEMBER", false]
  ] as const)("%s のロール管理可否を返す", (role, expected) => {
    expect(canManageRoles(role)).toBe(expected);
  });
});
