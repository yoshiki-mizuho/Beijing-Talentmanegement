import { describe, expect, it } from "vitest";

import {
  assertUserCanLinkToMember,
  MemberUserLinkError
} from "@/modules/members/domain/member-user-policy";
import { UserFacingError } from "@/shared/lib/user-facing-error";

describe("member user link policy", () => {
  it("allows linking an unlinked user", () => {
    expect(() => assertUserCanLinkToMember(null, "member-1")).not.toThrow();
  });

  it("allows relinking the same member", () => {
    expect(() => assertUserCanLinkToMember("member-1", "member-1")).not.toThrow();
  });

  it("rejects linking a user already linked to another member", () => {
    expect(() => assertUserCanLinkToMember("member-1", "member-2")).toThrow(
      MemberUserLinkError
    );
    expect(() => assertUserCanLinkToMember("member-1", "member-2")).toThrow(
      UserFacingError
    );
    expect(() => assertUserCanLinkToMember("member-1", "member-2")).toThrow(
      "別のメンバーにすでに紐付いています"
    );
  });
});
