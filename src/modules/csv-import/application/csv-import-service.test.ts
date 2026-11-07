import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadDepartments: vi.fn(),
  loadSkills: vi.fn(),
  loadMembers: vi.fn(),
  loadMemberSkills: vi.fn(),
  apply: vi.fn(),
  recordFailure: vi.fn(),
}));

vi.mock("../infrastructure/csv-import-repository", () => ({
  loadDepartmentImportState: mocks.loadDepartments,
  loadSkillImportState: mocks.loadSkills,
  loadMemberImportState: mocks.loadMembers,
  loadMemberSkillImportState: mocks.loadMemberSkills,
  applyCsvImport: mocks.apply,
  recordCsvImportValidationFailure: mocks.recordFailure,
}));

import { commitCsvImport, previewCsvImport } from "./csv-import-service";

describe("CSV取り込み失敗の監査", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadDepartments.mockResolvedValue([]);
  });

  it("previewの検証エラーをセル値なしで記録する", async () => {
    const preview = await previewCsvImport(
      "departments",
      csv("department_code,department_name,parent_department_code,is_active\nSECRET,,,"),
      "admin-1",
    );
    expect(preview.errors.length).toBeGreaterThan(0);
    expect(mocks.recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "preview", totalRows: 1 }),
    );
    expect(JSON.stringify(mocks.recordFailure.mock.calls[0][0])).not.toContain(
      "SECRET",
    );
  });

  it("previewの読み取りエラーを記録して同じエラーを返す", async () => {
    await expect(
      previewCsvImport("departments", csv(""), "admin-1"),
    ).rejects.toThrow("CSVに列名がありません");
    expect(mocks.recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "preview",
        errors: [{ message: "CSVに列名がありません" }],
      }),
    );
  });

  it("commitの再検証エラーにファイル名とcommit段階を記録する", async () => {
    const result = await commitCsvImport({
      target: "departments",
      bytes: csv("department_code,department_name,parent_department_code,is_active\nSECRET,,,"),
      previewToken: "token",
      originalName: "departments.csv",
      actorMemberId: "admin-1",
    });
    expect(result.status).toBe("invalid");
    expect(mocks.recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "commit",
        originalName: "departments.csv",
      }),
    );
  });

  it("commitのpreviewToken不一致を記録する", async () => {
    const result = await commitCsvImport({
      target: "departments",
      bytes: csv("department_code,department_name,parent_department_code,is_active\nD01,開発部,,true"),
      previewToken: "different",
      originalName: "departments.csv",
      actorMemberId: "admin-1",
    });
    expect(result.status).toBe("conflict");
    expect(mocks.recordFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "commit",
        errors: [{ message: "プレビュー時の内容と一致しません" }],
      }),
    );
  });
});

function csv(value: string) {
  return new TextEncoder().encode(value);
}
