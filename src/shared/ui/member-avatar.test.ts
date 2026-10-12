import { describe, expect, it } from "vitest";

import { buildMemberAvatarUrl } from "@/shared/ui/member-avatar";

describe("buildMemberAvatarUrl", () => {
  it("更新日時をミリ秒にしてURLへ付ける", () => {
    expect(buildMemberAvatarUrl("member/a", "2026-10-12T12:00:00.123Z")).toBe(
      "/api/members/member%2Fa/avatar?v=1791806400123"
    );
  });

  it("更新日時がない場合はnullを返す", () => {
    expect(buildMemberAvatarUrl("member-1", null)).toBeNull();
  });
});
