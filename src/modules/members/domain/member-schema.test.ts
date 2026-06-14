import { MemberStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  memberInputSchema,
  memberSkillInputSchema
} from "@/modules/members/domain/member-schema";

describe("member schemas", () => {
  it("accepts valid member input", () => {
    expect(
      memberInputSchema.parse({
        employeeNo: "TM0100",
        name: "Test Member",
        email: "test.member@example.com",
        departmentId: "department-1",
        status: MemberStatus.ACTIVE
      })
    ).toMatchObject({
      employeeNo: "TM0100",
      status: MemberStatus.ACTIVE
    });
  });

  it("rejects invalid member skill levels", () => {
    expect(() =>
      memberSkillInputSchema.parse({
        memberId: "member-1",
        skillId: "skill-1",
        level: 0
      })
    ).toThrow();
  });
});
