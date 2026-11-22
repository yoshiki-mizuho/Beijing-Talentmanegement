import { describe, expect, it } from "vitest";

import { isLocalDatabaseUrl } from "./cleanup-e2e-policy";

describe("E2E cleanup policy", () => {
  it.each([
    "postgresql://user:pass@localhost:5432/talent",
    "postgresql://user:pass@127.0.0.1:5432/talent",
  ])("allows a local database URL", (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(true);
  });

  it.each([
    "postgresql://user:pass@db.example.com:5432/talent",
    "not-a-url",
  ])("rejects a non-local database URL", (url) => {
    expect(isLocalDatabaseUrl(url)).toBe(false);
  });
});
