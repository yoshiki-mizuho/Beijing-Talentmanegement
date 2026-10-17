import { describe, expect, it } from "vitest";
import {
  isGrowthLevelChange,
  nonGrowthLevelChangeSources,
} from "./level-change-source";

describe("isGrowthLevelChange", () => {
  it("BACKFILL と CSV_IMPORT を成長として扱わない", () => {
    expect(isGrowthLevelChange("BACKFILL")).toBe(false);
    expect(isGrowthLevelChange("CSV_IMPORT")).toBe(false);
    expect(isGrowthLevelChange("DIRECT_EDIT")).toBe(true);
    expect(nonGrowthLevelChangeSources).toHaveLength(2);
  });
});
