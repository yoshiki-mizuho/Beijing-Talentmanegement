import { describe, expect, it } from "vitest";

import { readDemoSeedPasswords } from "./seed-config";

const validEnvironment = {
  DEMO_ADMIN_PASSWORD: "admin-secret-123",
  DEMO_MANAGER_PASSWORD: "manager-secret-123",
  DEMO_MEMBER_PASSWORD: "member-secret-123"
};

describe("readDemoSeedPasswords", () => {
  it("accepts three strong, distinct passwords", () => {
    expect(readDemoSeedPasswords(validEnvironment)).toEqual({
      admin: validEnvironment.DEMO_ADMIN_PASSWORD,
      manager: validEnvironment.DEMO_MANAGER_PASSWORD,
      member: validEnvironment.DEMO_MEMBER_PASSWORD
    });
  });

  it("rejects a missing or short password", () => {
    expect(() =>
      readDemoSeedPasswords({
        ...validEnvironment,
        DEMO_MEMBER_PASSWORD: "short"
      })
    ).toThrow(
      "DEMO_MEMBER_PASSWORD must be at least 12 characters and must not use an example placeholder."
    );
  });

  it("rejects an example placeholder", () => {
    expect(() =>
      readDemoSeedPasswords({
        ...validEnvironment,
        DEMO_ADMIN_PASSWORD: "replace-with-a-unique-admin-password"
      })
    ).toThrow(
      "DEMO_ADMIN_PASSWORD must be at least 12 characters and must not use an example placeholder."
    );
  });

  it("rejects reused passwords", () => {
    expect(() =>
      readDemoSeedPasswords({
        ...validEnvironment,
        DEMO_MEMBER_PASSWORD: validEnvironment.DEMO_MANAGER_PASSWORD
      })
    ).toThrow("Demo seed passwords must be different for every role.");
  });
});
