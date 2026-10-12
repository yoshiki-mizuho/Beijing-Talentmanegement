import { describe, expect, it } from "vitest";

import { resolveMemberScope } from "@/modules/members/application/member-scope";

const source = {
  viewer: { id: "manager", departmentId: "dev", departmentName: "開発部" },
  departments: [
    { id: "dev", name: "開発部" },
    { id: "sales", name: "営業部" }
  ],
  members: [
    { id: "manager", departmentId: "dev", managerId: null, status: "ACTIVE" as const },
    { id: "same", departmentId: "dev", managerId: null, status: "ACTIVE" as const },
    { id: "leave", departmentId: "dev", managerId: null, status: "LEAVE" as const },
    { id: "direct", departmentId: "sales", managerId: "manager", status: "ACTIVE" as const },
    { id: "outside", departmentId: "sales", managerId: null, status: "ACTIVE" as const }
  ]
};

describe("resolveMemberScope", () => {
  it("ADMINは全社を対象にする", () => {
    expect(resolveMemberScope({ role: "ADMIN", ...source })).toMatchObject({
      memberIds: ["manager", "same", "leave", "direct", "outside"],
      activeMemberCount: 4,
      name: "全社"
    });
  });

  it("ADMINは部署を選べる", () => {
    expect(
      resolveMemberScope({
        role: "ADMIN",
        requestedDepartmentId: "sales",
        ...source
      })
    ).toMatchObject({
      memberIds: ["direct", "outside"],
      name: "営業部"
    });
  });

  it("MANAGERは同じ部署と部署外の直属部下を対象にし、休職中のメンバーも含める", () => {
    expect(resolveMemberScope({ role: "MANAGER", ...source })).toMatchObject({
      memberIds: ["manager", "same", "leave", "direct"],
      activeMemberCount: 3,
      name: "開発部"
    });
  });
});
