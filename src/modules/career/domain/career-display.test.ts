import { describe, expect, it } from "vitest";

import { calculateExperienceLabel } from "./career-display";

describe("calculateExperienceLabel", () => {
  const now = new Date("2026-11-01T00:30:00+09:00");

  it("1年未満と月境界を日本時間で計算する", () => {
    expect(calculateExperienceLabel("2026-01", now)).toBe("1年未満");
    expect(calculateExperienceLabel("2025-11", now)).toBe("1年");
    expect(calculateExperienceLabel("2020-11", now)).toBe("6年");
  });
});
