import { describe, expect, it } from "vitest";
import { createPreviewToken } from "./preview-token";

describe("preview token", () => {
  it("同じ内容は一致し変更後は一致しない", () => {
    expect(createPreviewToken({ a: 1, b: 2 })).toBe(
      createPreviewToken({ b: 2, a: 1 }),
    );
    expect(createPreviewToken({ a: 1 })).not.toBe(createPreviewToken({ a: 2 }));
  });
});
