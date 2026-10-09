import { describe, expect, it } from "vitest";

import { createsManagerCycle } from "@/modules/members/domain/member-manager-policy";

describe("createsManagerCycle", () => {
  const assignments = [
    { id: "member-a", managerId: "member-b" },
    { id: "member-b", managerId: "member-c" },
    { id: "member-c", managerId: null }
  ];

  it("rejects assigning the member as their own manager", () => {
    expect(createsManagerCycle("member-a", "member-a", assignments)).toBe(true);
  });

  it("detects a cycle through multiple managers", () => {
    expect(createsManagerCycle("member-c", "member-a", assignments)).toBe(true);
  });

  it("allows a manager chain that does not return to the member", () => {
    expect(createsManagerCycle("member-a", "member-c", assignments)).toBe(false);
    expect(createsManagerCycle("member-a", null, assignments)).toBe(false);
  });
});
