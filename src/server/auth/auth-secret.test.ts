import { describe, expect, it } from "vitest";

import { assertProductionAuthSecret, resolveAuthSecret } from "./auth-secret";

const longSecret = "a-secure-production-secret-value";
const errorMessage = "AUTH_SECRET (or NEXTAUTH_SECRET) must be at least 32 characters in production.";

describe("assertProductionAuthSecret", () => {
  it.each(["NEXTAUTH_SECRET", "AUTH_SECRET"])(
    "accepts a sufficiently long production secret in %s",
    (name) => {
      expect(() =>
        assertProductionAuthSecret({ NODE_ENV: "production", [name]: longSecret })
      ).not.toThrow();
    }
  );

  it.each([undefined, "short-secret"])(
    "rejects a missing or short production secret",
    (secret) => {
      expect(() =>
        assertProductionAuthSecret({ NODE_ENV: "production", AUTH_SECRET: secret })
      ).toThrow(errorMessage);
    }
  );

  it("does not require a secret during a production build", () => {
    expect(() =>
      assertProductionAuthSecret({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build"
      })
    ).not.toThrow();
  });

  it.each(["development", "test"])(
    "does not require a secret in %s",
    (nodeEnv) => {
      expect(() => assertProductionAuthSecret({ NODE_ENV: nodeEnv })).not.toThrow();
    }
  );
});

describe("resolveAuthSecret", () => {
  it("prefers NEXTAUTH_SECRET like next-auth v4", () => {
    expect(resolveAuthSecret({ NEXTAUTH_SECRET: "next", AUTH_SECRET: "auth" })).toBe("next");
    expect(resolveAuthSecret({ AUTH_SECRET: "auth" })).toBe("auth");
    expect(resolveAuthSecret({})).toBeUndefined();
  });
});
