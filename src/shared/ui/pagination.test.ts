import { describe, expect, it } from "vitest";

import { getPaginationItems } from "@/shared/ui/pagination";

describe("getPaginationItems", () => {
  it("7ページ以下はすべてのページを返す", () => {
    expect(getPaginationItems(7, 4)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("8ページ以上は先頭、末尾、現在の前後を省略記号でつなぐ", () => {
    expect(getPaginationItems(10, 5)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("先頭や末尾の近くでは重複せずに返す", () => {
    expect(getPaginationItems(10, 1)).toEqual([1, 2, "ellipsis", 10]);
    expect(getPaginationItems(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });
});
