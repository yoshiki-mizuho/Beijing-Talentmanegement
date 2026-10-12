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

describe("toCheerCelebration", () => {
  it("対象スキルと紹介された人を含む表示用データへ変換する", () => {
    const notification = buildNotification({
      message: "次のレベルも応援しています！",
      fromMember: { id: "manager-1", name: "山田" },
      targetSkill: { name: "TypeScript" },
      mentorMember: { id: "mentor-1", name: "佐藤" }
    });

    expect(toCheerCelebration(notification)).toEqual([
      {
        notificationId: "notification-1",
        createdAt: new Date("2026-10-12T00:00:00.000Z"),
        message: "次のレベルも応援しています！",
        sender: { id: "manager-1", name: "山田" },
        targetSkillName: "TypeScript",
        mentorMember: { id: "mentor-1", name: "佐藤" }
      }
    ]);
  });

  it("対象スキルと紹介された人がない場合は null として変換する", () => {
    const notification = buildNotification({
      message: "小さな前進も応援しています！",
      fromMember: { id: "manager-1", name: "山田" },
      targetSkill: null,
      mentorMember: null
    });

    expect(toCheerCelebration(notification)).toEqual([
      {
        notificationId: "notification-1",
        createdAt: new Date("2026-10-12T00:00:00.000Z"),
        message: "小さな前進も応援しています！",
        sender: { id: "manager-1", name: "山田" },
        targetSkillName: null,
        mentorMember: null
      }
    ]);
  });
});
