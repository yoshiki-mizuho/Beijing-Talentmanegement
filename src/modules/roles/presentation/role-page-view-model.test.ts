import { AuthRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildRolePageViewModel } from "@/modules/roles/presentation/role-page-view-model";

const roles = [
  {
    id: "role-1",
    name: "リード",
    description: null,
    isActive: true,
    roleRequirements: [
      {
        id: "requirement-1",
        skillId: "skill-1",
        requiredLevel: 3,
        isRequired: true,
        skill: { name: "設計", category: { name: "開発" } },
      },
    ],
  },
];
const activeMembers = [
  member("viewer", "本人", 1, "role-1"),
  member("report", "担当メンバー", 3, "role-1"),
  member("outside", "担当外メンバー", 3, "role-1"),
];

describe("buildRolePageViewModel", () => {
  it("MEMBERには他人の名前を渡さない", () => {
    const result = build(AuthRole.MEMBER, ["viewer"]);
    expect(result[0].visibleMemberStatuses).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("担当メンバー");
  });

  it("MANAGERには担当範囲のメンバーだけを渡す", () => {
    const result = build(AuthRole.MANAGER, ["viewer", "report"]);
    expect(result[0].visibleMemberStatuses.map((item) => item.name)).toEqual([
      "本人",
      "担当メンバー",
    ]);
  });

  it("ADMINには全社のメンバーを渡す", () => {
    const result = build(
      AuthRole.ADMIN,
      activeMembers.map((item) => item.id),
    );
    expect(result[0].visibleMemberStatuses).toHaveLength(3);
  });
});

function build(viewerRole: AuthRole, scopedMemberIds: string[]) {
  return buildRolePageViewModel({
    viewerRole,
    viewerMemberId: "viewer",
    scopedMemberIds,
    roles,
    activeMembers,
  });
}

function member(
  id: string,
  name: string,
  level: number,
  targetRoleId: string | null,
) {
  return {
    id,
    name,
    avatarUpdatedAt: null,
    department: { name: "開発部" },
    jobTitle: null,
    targetRoleId,
    memberSkills: [{ skillId: "skill-1", level, skill: { name: "設計" } }],
  };
}
