import { describe, expect, it } from "vitest";

import { generateInitialPassword } from "@/modules/auth/domain/initial-password";

describe("generateInitialPassword", () => {
  it("creates three groups of four unambiguous characters", () => {
    expect(generateInitialPassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{4}(?:-[A-HJ-NP-Za-km-z2-9]{4}){2}$/);
  });

  it("does not reuse the same value", () => {
    expect(new Set(Array.from({ length: 20 }, generateInitialPassword)).size).toBe(20);
  });
});
