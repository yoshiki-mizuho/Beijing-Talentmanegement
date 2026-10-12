import { describe, expect, it } from "vitest";

import {
  canViewMemberAvatar,
  memberAvatarMaxBytes,
  validateMemberAvatar
} from "@/modules/members/domain/member-avatar";

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("validateMemberAvatar", () => {
  it("MIMEとマジックナンバーが一致する上限サイズを許可する", () => {
    const bytes = new Uint8Array(memberAvatarMaxBytes);
    bytes.set(png);
    expect(() => validateMemberAvatar({ mimeType: "image/png", bytes })).not.toThrow();
  });

  it.each([
    ["未対応MIME", "image/gif", png, memberAvatarMaxBytes],
    ["不一致", "image/jpeg", png, memberAvatarMaxBytes],
    ["上限超過", "image/png", png, memberAvatarMaxBytes + 1]
  ])("%sを拒否する", (_label, mimeType, signature, size) => {
    const bytes = new Uint8Array(size as number);
    bytes.set(signature as number[]);
    expect(() => validateMemberAvatar({ mimeType: mimeType as string, bytes })).toThrow();
  });
});

describe("canViewMemberAvatar", () => {
  const member = {
    id: "target",
    managerId: "direct-manager",
    status: "ACTIVE",
    isProfilePublic: false
  };
  it.each([
    ["本人", { role: "MEMBER", memberId: "target" }, false, true],
    ["公開", { role: "MEMBER", memberId: "other" }, false, true],
    ["非公開", { role: "MEMBER", memberId: "other" }, false, false],
    ["ADMIN", { role: "ADMIN", memberId: "admin" }, false, true],
    ["自組織MANAGER", { role: "MANAGER", memberId: "manager" }, true, true],
    ["範囲外MANAGER", { role: "MANAGER", memberId: "manager" }, false, false]
  ])("%sの閲覧判定", (label, viewer, inScope, expected) => {
    expect(
      canViewMemberAvatar({
        viewer,
        member: { ...member, isProfilePublic: label === "公開" },
        managerScopeIncludesMember: inScope
      })
    ).toBe(expected);
  });
});
