import { describe, expect, it } from "vitest";

import { formatNotificationDate } from "@/modules/notifications/presentation/notification-date";

describe("formatNotificationDate", () => {
  const now = new Date("2026-10-10T03:00:00.000Z");

  it("当日は時刻を表示する", () => {
    expect(formatNotificationDate(new Date("2026-10-10T01:24:00.000Z"), now))
      .toBe("今日 10:24");
  });

  it("前日は昨日と表示する", () => {
    expect(formatNotificationDate(new Date("2026-10-09T14:59:00.000Z"), now))
      .toBe("昨日");
  });

  it("それ以前は月日を表示する", () => {
    expect(formatNotificationDate(new Date("2026-10-06T03:00:00.000Z"), now))
      .toBe("10/06");
  });

  it("日付境界は日本時間で判定する", () => {
    expect(formatNotificationDate(new Date("2026-10-09T15:01:00.000Z"), now))
      .toBe("今日 00:01");
  });
});
