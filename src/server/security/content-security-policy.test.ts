import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./content-security-policy";

describe("buildContentSecurityPolicy", () => {
  it("includes the request nonce and development-only eval support", () => {
    const policy = buildContentSecurityPolicy("test-nonce", "development");

    expect(policy).toContain("'nonce-test-nonce'");
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("enables upgrades and excludes unsafe eval in production", () => {
    const policy = buildContentSecurityPolicy("production-nonce", "production");

    expect(policy).toContain("'nonce-production-nonce'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-eval'");
  });
});
