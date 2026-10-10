import { describe, expect, it } from "vitest";

import { orderSkillHistorySnapshots } from "@/modules/explore/application/explore-service";

describe("skill history order", () => {
  it("orders marked snapshots from one year ago to five years ago", () => {
    const snapshots = [
      { yearsAgo: 5, marker: "new" },
      { yearsAgo: 3, marker: "up" },
      { yearsAgo: 1, marker: "up" }
    ];

    expect(orderSkillHistorySnapshots(snapshots)).toEqual([
      { yearsAgo: 1, marker: "up" },
      { yearsAgo: 3, marker: "up" },
      { yearsAgo: 5, marker: "new" }
    ]);
    expect(snapshots.map((snapshot) => snapshot.yearsAgo)).toEqual([5, 3, 1]);
  });
});
