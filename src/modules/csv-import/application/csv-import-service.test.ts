import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadSkills: vi.fn(),
  loadMemberSkills: vi.fn(),
  loadRoles: vi.fn(),
  apply: vi.fn(),
  recordFailure: vi.fn(),
}));

vi.mock("../infrastructure/csv-import-repository", () => ({
  loadSkillImportState: mocks.loadSkills,
  loadMemberSkillImportState: mocks.loadMemberSkills,
  loadRoleImportState: mocks.loadRoles,
  applyCsvImport: mocks.apply,
  recordCsvImportValidationFailure: mocks.recordFailure,
}));

import { previewCsvImport } from "./csv-import-service";

const member = { id: "member-1", email: "user@local-dev.test", name: "利用者" };
const skill = { id: "skill-1", code: "TS", name: "TypeScript", isActive: true };

describe("member skill CSV platform lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadMemberSkills.mockResolvedValue({
      members: [member],
      ambiguousEmails: [],
      skills: [skill],
      memberSkills: [],
    });
  });

  it("matches a member by platform email", async () => {
    const result = await previewCsvImport("member-skills", csv("user@local-dev.test"), "actor-1");
    expect(mocks.loadMemberSkills).toHaveBeenCalledWith("actor-1");
    expect(result.errors).toEqual([]);
    expect(result.changes).toEqual([
      expect.objectContaining({ kind: "new", memberId: "member-1", skillId: "skill-1" }),
    ]);
  });

  it("returns a row error when the platform user is missing", async () => {
    mocks.loadMemberSkills.mockResolvedValue({
      members: [],
      ambiguousEmails: [],
      skills: [skill],
      memberSkills: [],
    });
    const result = await previewCsvImport("member-skills", csv("missing@local-dev.test"), "actor-1");
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 2, column: "email" }),
    ]);
  });

  it("returns a row error when the platform is unavailable", async () => {
    mocks.loadMemberSkills.mockRejectedValue(new Error("unavailable"));
    const result = await previewCsvImport("member-skills", csv("user@local-dev.test"), "actor-1");
    expect(result.errors).toEqual([
      expect.objectContaining({
        row: 2,
        column: "email",
        message: "基盤の利用者を確認できませんでした",
      }),
    ]);
  });

  it("returns a row error when an email is ambiguous", async () => {
    mocks.loadMemberSkills.mockResolvedValue({
      members: [member],
      ambiguousEmails: ["user@local-dev.test"],
      skills: [skill],
      memberSkills: [],
    });
    const result = await previewCsvImport("member-skills", csv("user@local-dev.test"), "actor-1");
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 2, column: "email" }),
    ]);
  });
});

function csv(email: string) {
  return new TextEncoder().encode(
    `email,skill_code,level,years_of_experience,last_assessed_at\n${email},TS,3,2.5,2026-10-16`,
  );
}
