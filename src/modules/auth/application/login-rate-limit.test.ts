import { describe, expect, it, beforeEach } from "vitest";

import {
  buildLoginRateLimitKey,
  checkLoginRateLimit,
  recordLoginFailure,
  resetAllLoginRateLimitStateForTest,
  resetLoginFailures
} from "@/modules/auth/application/login-rate-limit";

describe("login rate limit", () => {
  beforeEach(() => {
    resetAllLoginRateLimitStateForTest();
  });

  it("locks the same IP and email after repeated failures", () => {
    const key = buildLoginRateLimitKey("127.0.0.1", "ADMIN@EXAMPLE.COM");

    for (let index = 0; index < 5; index += 1) {
      recordLoginFailure(key, 1_000 + index);
    }

    expect(checkLoginRateLimit(key, 2_000)).toEqual({
      allowed: false,
      retryAfterSeconds: 600
    });
  });

  it("resets failures after successful login", () => {
    const key = buildLoginRateLimitKey("127.0.0.1", "admin@example.com");

    recordLoginFailure(key, 1_000);
    resetLoginFailures(key);

    expect(checkLoginRateLimit(key, 2_000)).toEqual({ allowed: true });
  });
});
