import { describe, expect, it } from "vitest";

import { sanitizeImportFileName } from "./import-file-name";

describe("sanitizeImportFileName", () => {
  it("decodes a valid file name", () => {
    expect(sanitizeImportFileName("members%20list.csv")).toBe("members list.csv");
  });

  it("uses a safe fallback when decoding fails", () => {
    expect(sanitizeImportFileName("invalid%ZZ.csv")).toBe("不明なファイル");
  });

  it("removes control characters and path separators", () => {
    expect(sanitizeImportFileName("..%2Ffolder%5Cmembers%00.csv")).toBe(
      "..foldermembers.csv"
    );
  });

  it("limits the file name to 255 characters", () => {
    expect(sanitizeImportFileName("a".repeat(300))).toHaveLength(255);
  });
});
