import { describe, expect, it } from "vitest";
import { canAccessProposalSheet, initialProposalDisplayName } from "./proposal-sheet-access";

describe("proposal sheet access", () => {
  it.each([
    ["ADMIN", false, true], ["MANAGER", true, true],
    ["MANAGER", false, false], ["MEMBER", true, false]
  ] as const)("%s / scope=%s", (role, targetIsInScope, expected) => {
    expect(canAccessProposalSheet({ role, targetIsInScope })).toBe(expected);
  });
  it("英字名をイニシャルにし、日本語名は空にする", () => {
    expect(initialProposalDisplayName("Member User")).toBe("M.U.");
    expect(initialProposalDisplayName("山田 太郎")).toBe("");
  });
});
