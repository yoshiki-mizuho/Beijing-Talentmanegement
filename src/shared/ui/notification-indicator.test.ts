import { describe, expect, it } from "vitest";

import {
  formatUnreadNotificationCount,
  getNotificationAccessibleLabel
} from "@/shared/ui/notification-indicator";

describe("notification indicator", () => {
  it.each([
    { count: 0, visible: "0" },
    { count: 1, visible: "1" },
    { count: 99, visible: "99" },
    { count: 100, visible: "99+" },
    { count: 999, visible: "99+" }
  ])("$count件を$visibleと整形する", ({ count, visible }) => {
    expect(formatUnreadNotificationCount(count)).toBe(visible);
  });

  it("0件では未読がないことをアクセシブル名で伝える", () => {
    expect(getNotificationAccessibleLabel(0)).toBe(
      "通知を開く、未読通知はありません"
    );
  });

  it("大きな件数でも実件数をアクセシブル名に残す", () => {
    expect(getNotificationAccessibleLabel(123)).toBe(
      "通知を開く、未読通知123件"
    );
  });

  it("不正な負数を0件として扱う", () => {
    expect(formatUnreadNotificationCount(-1)).toBe("0");
    expect(getNotificationAccessibleLabel(-1)).toBe(
      "通知を開く、未読通知はありません"
    );
  });
});