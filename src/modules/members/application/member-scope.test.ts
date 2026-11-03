import { describe, expect, it } from "vitest";

import { resolveMemberScope } from "@/modules/members/application/member-scope";

const source = {
  viewer: { id: "manager", departmentId: "dev", departmentName: "開発部" },
  departments: [
    { id: "hq", name: "開発本部", parentDepartmentId: null },
    { id: "dev", name: "開発部", parentDepartmentId: "hq" },
    { id: "team", name: "第1課", parentDepartmentId: "dev" },
    { id: "infra", name: "インフラ部", parentDepartmentId: "hq" },
    { id: "sales", name: "営業部", parentDepartmentId: null }
  ],
  members: [
    { id: "manager", departmentId: "dev", managerId: null, status: "ACTIVE" as const },
    { id: "same", departmentId: "dev", managerId: null, status: "ACTIVE" as const },
    { id: "leave", departmentId: "dev", managerId: null, status: "LEAVE" as const },
    { id: "child", departmentId: "team", managerId: null, status: "ACTIVE" as const },
    { id: "sibling", departmentId: "infra", managerId: null, status: "ACTIVE" as const },
    { id: "direct", departmentId: "sales", managerId: "manager", status: "ACTIVE" as const },
    { id: "outside", departmentId: "sales", managerId: null, status: "ACTIVE" as const }
  ]
};

describe("resolveMemberScope", () => {
  it("ADMINは全社を対象にする", () => {
    expect(resolveMemberScope({ role: "ADMIN", ...source })).toMatchObject({
      memberIds: ["manager", "same", "leave", "child", "sibling", "direct", "outside"],
      activeMemberCount: 6,
      name: "全社"
    });
  });

  it("ADMINは部署を選べる", () => {
    expect(
      resolveMemberScope({
        role: "ADMIN",
        requestedDepartmentId: "hq",
        ...source
      })
    ).toMatchObject({
      memberIds: ["manager", "same", "leave", "child", "sibling"],
      name: "開発本部"
    });
  });

  it("MANAGERは自部署と配下、部署外の直属部下を対象にし、並列部署は含めない", () => {
    expect(resolveMemberScope({ role: "MANAGER", ...source })).toMatchObject({
      memberIds: ["manager", "same", "leave", "child", "direct"],
      activeMemberCount: 4,
      name: "開発部"
    });
  });
});
