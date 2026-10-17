import { describe, expect, it } from "vitest";

import { formatImportChanges } from "./import-change-format";

describe("formatImportChanges", () => {
  it("項目名と値を日本語にする", () => {
    expect(
      formatImportChanges({
        name: { before: "開発部", after: "開発本部" },
        parentCode: { before: null, after: "HQ" },
        isActive: { before: true, after: false },
        categoryName: { before: "言語", after: "フレームワーク" },
      }),
    ).toEqual([
      { label: "名前", before: "開発部", after: "開発本部" },
      { label: "親部署コード", before: "—", after: "HQ" },
      { label: "状態", before: "有効", after: "無効" },
      { label: "カテゴリ", before: "言語", after: "フレームワーク" },
    ]);
  });
});
