import { describe, expect, it } from "vitest";

import { assertDemoSeedAllowed, readDemoSeedPasswords } from "./seed-config";

const validEnvironment = {
  DEMO_ADMIN_PASSWORD: "admin-secret-123",
  DEMO_MANAGER_PASSWORD: "manager-secret-123",
  DEMO_MEMBER_PASSWORD: "member-secret-123"
};

describe("assertDemoSeedAllowed", () => {
  it.each(["localhost", "127.0.0.1", "postgres"])(
    "allows the database host %s",
    (host) => {
      expect(() =>
        assertDemoSeedAllowed(`postgresql://user:secret@${host}:5432/app`, undefined)
      ).not.toThrow();
    }
  );

  it("allows a remote database only with the explicit opt-in", () => {
    expect(() =>
      assertDemoSeedAllowed(
        "postgresql://user:secret@db.example.com/app",
        "true"
      )
    ).not.toThrow();
  });

  it.each([undefined, "not-a-url", "postgresql://user:secret@db.example.com/app"])(
    "rejects an unsafe database URL without exposing it",
    (databaseUrl) => {
      expect(() => assertDemoSeedAllowed(databaseUrl, undefined)).toThrow(
        "Demo seed is disabled for this database."
      );
    }
  );
});

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
