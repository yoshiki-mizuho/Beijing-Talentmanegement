import { describe, expect, it } from "vitest";

import type {
  MemberRow,
  RoleOption
} from "@/modules/members/presentation/member-presentation-types";
import {
  evaluateMemberTargetRole,
  matchesTargetRoleFilter,
  parseTargetRoleFilter
} from "@/modules/members/presentation/target-role-filter";

const roles: RoleOption[] = [
  {
    id: "role-1",
    name: "エンジニア",
    roleRequirements: [
      {
        skillId: "skill-1",
        requiredLevel: 3,
        isRequired: true,
        skill: { name: "TypeScript" }
      }
    ]
  }
];

function member(targetRoleId: string | null, level?: number): MemberRow {
  return {
    id: "member-1",
    employeeNo: "TM0001",
    name: "テスト太郎",
    avatarUpdatedAt: null,
    email: "test@example.com",
    profile: null,
    status: "ACTIVE",
    jobTitle: null,
    departmentId: "department-1",
    department: { id: "department-1", name: "開発部" },
    managerId: null,
    manager: null,
    targetRoleId,
    targetRole: targetRoleId ? { id: targetRoleId, name: "エンジニア", isActive: true } : null,
    memberSkills:
      level === undefined
        ? []
        : [
            {
              id: "member-skill-1",
              skillId: "skill-1",
              level,
              skill: { id: "skill-1", name: "TypeScript", category: { name: "開発" } }
            }
          ]
  };
}

describe("target role filter", () => {
  it("uses the role achievement result for achieved and in-progress members", () => {
    expect(evaluateMemberTargetRole(member("role-1", 3), roles)?.achieved).toBe(true);
    expect(matchesTargetRoleFilter(member("role-1", 3), roles, "achieved")).toBe(true);
    expect(matchesTargetRoleFilter(member("role-1", 2), roles, "in_progress")).toBe(true);
  });

  it("treats members without a resolvable target role as unset", () => {
    expect(evaluateMemberTargetRole(member(null), roles)).toBeNull();
    expect(matchesTargetRoleFilter(member(null), roles, "unset")).toBe(true);
  });

  it("accepts only supported URL values", () => {
    expect(parseTargetRoleFilter("achieved")).toBe("achieved");
    expect(parseTargetRoleFilter("invalid")).toBe("");
    expect(parseTargetRoleFilter(["unset"])).toBe("");
  });
});
