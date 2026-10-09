import { describe, expect, it } from "vitest";

import { getTrappedFocusIndex } from "@/shared/ui/dialog";

describe("getTrappedFocusIndex", () => {
  it("wraps forward focus from the last control to the first", () => {
    expect(getTrappedFocusIndex(3, 4, "forward")).toBe(0);
  });

  it("wraps backward focus from the first control to the last", () => {
    expect(getTrappedFocusIndex(0, 4, "backward")).toBe(3);
  });

  it("moves focus within the dialog", () => {
    expect(getTrappedFocusIndex(1, 4, "forward")).toBe(2);
    expect(getTrappedFocusIndex(2, 4, "backward")).toBe(1);
  });

  it("returns no target when the dialog has no focusable control", () => {
    expect(getTrappedFocusIndex(0, 0, "forward")).toBe(-1);
  });
});
