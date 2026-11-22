import { describe, expect, it } from "vitest";

import { omitMemberDetailFields } from "@/modules/members/application/member-service";
import type { MemberRow } from "@/modules/members/presentation/member-presentation-types";

describe("omitMemberDetailFields", () => {
  it("keeps list fields and removes detail-only fields", () => {
    const member: MemberRow = {
      id: "member-1",
      name: "テスト太郎",
      email: "test@example.com",
      profile: "詳細プロフィール",
      status: "ACTIVE",
      nodeId: "node-1",
      organizationNode: { id: "node-1", name: "開発部" },
      targetRoleId: null,
      targetRole: null,
      roleAchievements: [],
      role: "MEMBER",
      pendingAssessments: [
        {
          skillId: "skill-1",
          requestedLevel: 3,
          skill: { name: "TypeScript", category: { name: "開発" } }
        }
      ],
      memberSkills: []
    };

    const item = omitMemberDetailFields(member);

    expect(item).toMatchObject({
      id: "member-1",
      name: "テスト太郎",
      pendingAssessmentCount: 1
    });
    expect(item).not.toHaveProperty("email");
    expect(item).not.toHaveProperty("profile");
    expect(item).not.toHaveProperty("manager");
    expect(item).not.toHaveProperty("pendingAssessments");
  });
});
