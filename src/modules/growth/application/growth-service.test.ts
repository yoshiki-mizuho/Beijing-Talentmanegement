import { describe, expect, it } from "vitest";

import { toCheerCelebration } from "@/modules/growth/application/growth-service";
import type { UnreadCheerNotification } from "@/modules/growth/infrastructure/member-growth-repository";

function buildNotification(cheer: UnreadCheerNotification["cheer"]): UnreadCheerNotification {
  return {
    id: "notification-1",
    createdAt: new Date("2026-10-12T00:00:00.000Z"),
    cheer
  };
}

function profile(memberId: string, name: string) {
  return {
    id: memberId,
    memberId,
    platformUserId: `platform-${memberId}`,
    name,
    email: "",
    nodeId: null,
    nodeName: null,
    avatarUrl: null,
    avatarColor: null,

    missingOnPlatform: false
  };
}

describe("toCheerCelebration", () => {
  it("対象スキルと紹介された人を含む表示用データへ変換する", () => {
    const notification = buildNotification({
      message: "次のレベルも応援しています！",
      fromMember: { id: "manager-1" },
      targetSkill: { name: "TypeScript" },
      mentorMember: { id: "mentor-1" }
    });

    expect(toCheerCelebration(notification, new Map([
      ["manager-1", profile("manager-1", "山田")],
      ["mentor-1", profile("mentor-1", "佐藤")]
    ]))).toEqual([
      {
        notificationId: "notification-1",
        createdAt: new Date("2026-10-12T00:00:00.000Z"),
        message: "次のレベルも応援しています！",
        sender: profile("manager-1", "山田"),
        targetSkillName: "TypeScript",
        mentorMember: profile("mentor-1", "佐藤")
      }
    ]);
  });

  it("対象スキルと紹介された人がない場合は null として変換する", () => {
    const notification = buildNotification({
      message: "小さな前進も応援しています！",
      fromMember: { id: "manager-1" },
      targetSkill: null,
      mentorMember: null
    });

    expect(toCheerCelebration(notification, new Map([
      ["manager-1", profile("manager-1", "山田")]
    ]))).toEqual([
      {
        notificationId: "notification-1",
        createdAt: new Date("2026-10-12T00:00:00.000Z"),
        message: "小さな前進も応援しています！",
        sender: profile("manager-1", "山田"),
        targetSkillName: null,
        mentorMember: null
      }
    ]);
  });
});
