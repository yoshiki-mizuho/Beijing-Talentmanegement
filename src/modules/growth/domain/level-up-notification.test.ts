import { describe, expect, it } from "vitest";

import {
  buildLevelUpReactionNotificationBody,
  uniqueReplyRecipientIds
} from "./level-up-notification";

describe("level-up notifications", () => {
  it("formats one reactor", () => {
    expect(buildLevelUpReactionNotificationBody({
      actorName: "佐藤",
      reactorCount: 1,
      skillName: "TypeScript",
      toLevel: 3
    })).toBe("佐藤さんが TypeScript Lv3 にリアクションしました");
  });

  it("formats multiple distinct reactors", () => {
    expect(buildLevelUpReactionNotificationBody({
      actorName: "鈴木",
      reactorCount: 3,
      skillName: "TypeScript",
      toLevel: 3
    })).toBe("鈴木さんほか 2人が TypeScript Lv3 にリアクションしました");
  });

  it("excludes the owner and inactive members and removes duplicates", () => {
    expect(uniqueReplyRecipientIds("owner", [
      { authorMemberId: "owner", authorMember: { status: "ACTIVE" } },
      { authorMemberId: "member-1", authorMember: { status: "ACTIVE" } },
      { authorMemberId: "member-1", authorMember: { status: "ACTIVE" } },
      { authorMemberId: "member-2", authorMember: { status: "INACTIVE" } }
    ])).toEqual(["member-1"]);
  });
});
