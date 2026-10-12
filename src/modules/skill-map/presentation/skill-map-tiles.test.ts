import { describe, expect, it } from "vitest";

import { getTileSpan } from "@/modules/skill-map/presentation/skill-map-tiles";

describe("getTileSpan", () => {
  it("最も保有者が多いスキルに近いほど大きい面にする", () => {
    expect(getTileSpan(10, 10)).toEqual({ gridColumn: "span 2", gridRow: "span 2" });
    expect(getTileSpan(5, 10)).toEqual({ gridColumn: "span 2", gridRow: "span 1" });
    expect(getTileSpan(2, 10)).toEqual({ gridColumn: "span 1", gridRow: "span 1" });
  });

  it("保有者がごく少ないときは割合が高くても大きくしない", () => {
    expect(getTileSpan(1, 1)).toEqual({ gridColumn: "span 1", gridRow: "span 1" });
    expect(getTileSpan(2, 2)).toEqual({ gridColumn: "span 2", gridRow: "span 1" });
    expect(getTileSpan(0, 0)).toEqual({ gridColumn: "span 1", gridRow: "span 1" });
  });
});
