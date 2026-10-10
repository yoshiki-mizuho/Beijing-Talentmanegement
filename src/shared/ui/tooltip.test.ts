import { describe, expect, it } from "vitest";

import { calculateTooltipPosition } from "@/shared/ui/tooltip";

const anchorRect = {
  top: 40,
  right: 120,
  bottom: 60,
  left: 100,
  width: 20,
  height: 20
};

describe("calculateTooltipPosition", () => {
  it("右端では画面内に寄せる", () => {
    expect(calculateTooltipPosition({
      anchorRect: { ...anchorRect, right: 320, left: 300 },
      tooltipSize: { width: 80, height: 24 },
      viewportSize: { width: 320, height: 200 },
      side: "bottom"
    })).toEqual({ left: 232, top: 68 });
  });

  it("左端では画面内に寄せる", () => {
    expect(calculateTooltipPosition({
      anchorRect: { ...anchorRect, right: 20, left: 0 },
      tooltipSize: { width: 80, height: 24 },
      viewportSize: { width: 320, height: 200 },
      side: "bottom"
    })).toEqual({ left: 8, top: 68 });
  });

  it("下に入らない場合は対象の上に出す", () => {
    expect(calculateTooltipPosition({
      anchorRect: { ...anchorRect, top: 170, bottom: 190 },
      tooltipSize: { width: 80, height: 24 },
      viewportSize: { width: 320, height: 200 },
      side: "bottom"
    })).toEqual({ left: 70, top: 138 });
  });

  it("右に入らない場合は対象の左に出す", () => {
    expect(calculateTooltipPosition({
      anchorRect: { ...anchorRect, right: 310, left: 290 },
      tooltipSize: { width: 80, height: 24 },
      viewportSize: { width: 320, height: 200 },
      side: "right"
    })).toEqual({ left: 202, top: 38 });
  });
});
