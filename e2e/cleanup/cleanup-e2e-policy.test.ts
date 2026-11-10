import { describe, expect, it } from "vitest";

import { isE2eMember, isLocalDatabaseUrl } from "./cleanup-e2e-policy";

describe("isLocalDatabaseUrl", () => {
  it.each(["localhost", "127.0.0.1", "[::1]", "postgres"])(
    "allows the local database host %s",
    (host) => {
      expect(
        isLocalDatabaseUrl(`postgresql://user:secret@${host}:5432/app`),
      ).toBe(true);
    },
  );

  it("rejects a remote database without exposing credentials", () => {
    expect(
      isLocalDatabaseUrl("postgresql://user:secret@db.example.com/app"),
    ).toBe(false);
  });

  it("rejects an invalid URL", () => {
    expect(isLocalDatabaseUrl("not-a-url")).toBe(false);
  });
});

describe("isE2eMember", () => {
  it.each([
    { employeeNo: "E2E-1", name: "テスト", email: "person@example.com" },
    { employeeNo: "FIRST-1", name: "テスト", email: "person@example.com" },
    { employeeNo: "X1", name: "初回画面-1", email: "person@example.com" },
    { employeeNo: "X2", name: "テスト", email: "look-1@example.com" },
  ])("matches an E2E-created member", (candidate) => {
    expect(isE2eMember(candidate)).toBe(true);
  });

  it.each([
    { employeeNo: "TM0001", name: "E2E管理者", email: "admin@example.com" },
    {
      employeeNo: "TM0101",
      name: "E2Eデモ",
      email: "demo-member-101@example.com",
    },
  ])("never matches a seed member", (candidate) => {
    expect(isE2eMember(candidate)).toBe(false);
  });
});
